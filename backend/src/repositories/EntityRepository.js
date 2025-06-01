const BaseRepository = require('./BaseRepository');
const crypto = require('crypto');

/**
 * Repository for managing entities (people, companies, projects, etc.)
 */
class EntityRepository extends BaseRepository {
    constructor(db) {
        super(db, 'entities');
        this.preparedStatements = this.prepareStatements();
    }

    /**
     * Prepare commonly used statements for performance
     */
    prepareStatements() {
        return {
            create: this.db.prepare(`
                INSERT INTO entities (id, type, name, description, importance_score, metadata)
                VALUES (@id, @type, @name, @description, @importance_score, @metadata)
            `),
            
            update: this.db.prepare(`
                UPDATE entities 
                SET name = @name, 
                    description = @description, 
                    importance_score = @importance_score, 
                    metadata = @metadata,
                    last_accessed = unixepoch()
                WHERE id = @id
            `),
            
            updateImportance: this.db.prepare(`
                UPDATE entities 
                SET importance_score = @importance_score 
                WHERE id = @id
            `),
            
            search: this.db.prepare(`
                SELECT * FROM entities 
                WHERE name LIKE @search OR description LIKE @search
                ORDER BY importance_score DESC, updated_at DESC
                LIMIT @limit
            `),
            
            findByType: this.db.prepare(`
                SELECT * FROM entities 
                WHERE type = @type
                ORDER BY importance_score DESC, updated_at DESC
                LIMIT @limit OFFSET @offset
            `),
            
            findImportant: this.db.prepare(`
                SELECT * FROM entities 
                WHERE importance_score >= @threshold
                ORDER BY importance_score DESC, updated_at DESC
                LIMIT @limit
            `),
            
            updateAccess: this.db.prepare(`
                UPDATE entities 
                SET last_accessed = unixepoch(), 
                    access_count = access_count + 1 
                WHERE id = @id
            `)
        };
    }

    /**
     * Create a new entity
     */
    create(data) {
        const entity = {
            id: data.id || crypto.randomUUID(),
            type: data.type || 'concept',
            name: data.name,
            description: data.description || '',
            importance_score: data.importance_score || 0.5,
            metadata: JSON.stringify(data.metadata || {})
        };

        this.preparedStatements.create.run(entity);
        return this.findById(entity.id);
    }

    /**
     * Update an entity
     */
    update(id, data) {
        const current = this.findById(id);
        if (!current) {
            throw new Error(`Entity not found: ${id}`);
        }

        const updated = {
            id,
            name: data.name || current.name,
            description: data.description !== undefined ? data.description : current.description,
            importance_score: data.importance_score !== undefined ? data.importance_score : current.importance_score,
            metadata: JSON.stringify({
                ...this.parseJSON(current.metadata),
                ...(data.metadata || {})
            })
        };

        this.preparedStatements.update.run(updated);
        return this.findById(id);
    }

    /**
     * Search entities by name or description
     */
    search(query, limitOrOptions = 50) {
        // Handle both old style (query, limit) and new style (query, options)
        const limit = typeof limitOrOptions === 'number' ? limitOrOptions : (limitOrOptions.limit || 50);
        const searchTerm = query.includes('%') ? query : `%${query}%`;
        
        const entities = this.preparedStatements.search.all({
            search: searchTerm,
            limit
        });

        return entities.map(entity => ({
            ...entity,
            metadata: this.parseJSON(entity.metadata)
        }));
    }

    /**
     * Override base findById to parse metadata
     */
    findById(id) {
        const entity = super.findById(id);
        return entity ? { ...entity, metadata: this.parseJSON(entity.metadata) } : null;
    }

    /**
     * Override base findAll to parse metadata
     */
    findAll(limit = 100, offset = 0) {
        const entities = super.findAll(limit, offset);
        return entities.map(entity => ({
            ...entity,
            metadata: this.parseJSON(entity.metadata)
        }));
    }

    /**
     * Find entity by name
     */
    findByName(name) {
        const stmt = this.db.prepare('SELECT * FROM entities WHERE name = ?');
        const entity = stmt.get(name);
        return entity ? { ...entity, metadata: this.parseJSON(entity.metadata) } : null;
    }

    /**
     * Find entities by type
     */
    findByType(type, options = {}) {
        const { limit = 100, offset = 0 } = options;
        return this.preparedStatements.findByType.all({
            type,
            limit,
            offset
        });
    }

    /**
     * Find important entities
     */
    findImportant(threshold = 0.7, limit = 50) {
        return this.preparedStatements.findImportant.all({
            threshold,
            limit
        });
    }

    /**
     * Get all people
     */
    getPeople(options = {}) {
        return this.findByType('person', options);
    }

    /**
     * Get all companies
     */
    getCompanies(options = {}) {
        return this.findByType('concept', options)
            .filter(e => {
                const meta = this.parseJSON(e.metadata);
                return meta.originalType === 'company' || meta.originalType === 'Company';
            });
    }

    /**
     * Get all projects
     */
    getProjects(options = {}) {
        return this.findByType('task', options)
            .filter(e => {
                const meta = this.parseJSON(e.metadata);
                return meta.originalType === 'project' || meta.originalType === 'Project';
            });
    }

    /**
     * Update entity importance
     */
    updateImportance(id, importance) {
        if (importance < 0 || importance > 1) {
            throw new Error('Importance must be between 0 and 1');
        }

        const result = this.preparedStatements.updateImportance.run({
            id,
            importance_score: importance
        });

        return result.changes > 0;
    }

    /**
     * Record entity access (updates last_accessed and access_count)
     */
    recordAccess(id) {
        this.preparedStatements.updateAccess.run({ id });
    }

    /**
     * Get entity with all related data
     */
    getWithRelations(id) {
        const entity = this.findById(id);
        if (!entity) return null;

        // Get relations
        const relations = this.db.prepare(`
            SELECT r.*, 
                   e1.name as source_name, e1.type as source_type,
                   e2.name as target_name, e2.type as target_type
            FROM relations r
            JOIN entities e1 ON r.source_id = e1.id
            JOIN entities e2 ON r.target_id = e2.id
            WHERE r.source_id = @id OR r.target_id = @id
        `).all({ id });

        // Get observations
        const observations = this.db.prepare(`
            SELECT * FROM observations 
            WHERE entity_id = @id
            ORDER BY timestamp DESC
            LIMIT 50
        `).all({ id });

        return {
            ...entity,
            metadata: this.parseJSON(entity.metadata),
            relations,
            observations,
            created_at: this.formatDate(entity.created_at),
            updated_at: this.formatDate(entity.updated_at),
            last_accessed: this.formatDate(entity.last_accessed)
        };
    }

    /**
     * Get entities by recency
     */
    getRecent(limit = 20) {
        return this.db.prepare(`
            SELECT * FROM entities 
            ORDER BY updated_at DESC 
            LIMIT ?
        `).all(limit);
    }

    /**
     * Get frequently accessed entities
     */
    getFrequentlyAccessed(limit = 20) {
        return this.db.prepare(`
            SELECT * FROM entities 
            WHERE access_count > 0
            ORDER BY access_count DESC, last_accessed DESC
            LIMIT ?
        `).all(limit);
    }

    /**
     * Bulk create entities
     */
    bulkCreate(entities) {
        return this.transaction(() => {
            const created = [];
            for (const entity of entities) {
                created.push(this.create(entity));
            }
            return created;
        });
    }
}

module.exports = EntityRepository;