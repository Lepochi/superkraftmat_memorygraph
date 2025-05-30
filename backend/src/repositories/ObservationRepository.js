const BaseRepository = require('./BaseRepository');

/**
 * Repository for managing observations (historical notes/context)
 */
class ObservationRepository extends BaseRepository {
    constructor(db) {
        super(db, 'observations');
        this.preparedStatements = this.prepareStatements();
    }

    /**
     * Prepare commonly used statements
     */
    prepareStatements() {
        return {
            create: this.db.prepare(`
                INSERT INTO observations (entity_id, content, context, importance)
                VALUES (@entity_id, @content, @context, @importance)
            `),
            
            findByEntity: this.db.prepare(`
                SELECT * FROM observations 
                WHERE entity_id = @entity_id
                ORDER BY timestamp DESC
                LIMIT @limit OFFSET @offset
            `),
            
            findRecent: this.db.prepare(`
                SELECT o.*, e.name as entity_name, e.type as entity_type
                FROM observations o
                JOIN entities e ON o.entity_id = e.id
                ORDER BY o.timestamp DESC
                LIMIT @limit
            `),
            
            findByImportance: this.db.prepare(`
                SELECT o.*, e.name as entity_name, e.type as entity_type
                FROM observations o
                JOIN entities e ON o.entity_id = e.id
                WHERE o.importance >= @threshold
                ORDER BY o.timestamp DESC
                LIMIT @limit
            `),
            
            search: this.db.prepare(`
                SELECT o.*, e.name as entity_name, e.type as entity_type
                FROM observations o
                JOIN entities e ON o.entity_id = e.id
                WHERE o.content LIKE @search
                ORDER BY o.timestamp DESC, o.importance DESC
                LIMIT @limit
            `),
            
            deleteOld: this.db.prepare(`
                DELETE FROM observations
                WHERE timestamp < @cutoff
                  AND importance < @importance_threshold
            `)
        };
    }

    /**
     * Add a new observation
     */
    create(entityId, content, options = {}) {
        const { context = {}, importance = 0.5 } = options;
        
        const result = this.preparedStatements.create.run({
            entity_id: entityId,
            content,
            context: JSON.stringify(context),
            importance
        });
        
        return this.findById(result.lastInsertRowid);
    }

    /**
     * Add a note (alias for create)
     */
    addNote(entityId, note, importance = 0.5) {
        return this.create(entityId, note, { importance });
    }

    /**
     * Get observation history for an entity
     */
    getHistory(entityId, options = {}) {
        const { limit = 50, offset = 0 } = options;
        
        const observations = this.preparedStatements.findByEntity.all({
            entity_id: entityId,
            limit,
            offset
        });
        
        return observations.map(obs => ({
            ...obs,
            context: this.parseJSON(obs.context),
            timestamp_formatted: this.formatDate(obs.timestamp)
        }));
    }

    /**
     * Get recent observations across all entities
     */
    getRecent(limit = 50) {
        const observations = this.preparedStatements.findRecent.all({ limit });
        
        return observations.map(obs => ({
            ...obs,
            context: this.parseJSON(obs.context),
            timestamp_formatted: this.formatDate(obs.timestamp)
        }));
    }

    /**
     * Find important observations
     */
    findImportant(threshold = 0.7, limit = 50) {
        const observations = this.preparedStatements.findByImportance.all({
            threshold,
            limit
        });
        
        return observations.map(obs => ({
            ...obs,
            context: this.parseJSON(obs.context),
            timestamp_formatted: this.formatDate(obs.timestamp)
        }));
    }

    /**
     * Search observations by content
     */
    search(query, limit = 50) {
        const observations = this.preparedStatements.search.all({
            search: `%${query}%`,
            limit
        });
        
        return observations.map(obs => ({
            ...obs,
            context: this.parseJSON(obs.context),
            timestamp_formatted: this.formatDate(obs.timestamp)
        }));
    }

    /**
     * Get observations by time range
     */
    getByTimeRange(startTime, endTime, options = {}) {
        const { entityId, limit = 100 } = options;
        
        let query = `
            SELECT o.*, e.name as entity_name, e.type as entity_type
            FROM observations o
            JOIN entities e ON o.entity_id = e.id
            WHERE o.timestamp >= @startTime 
              AND o.timestamp <= @endTime
        `;
        
        const params = {
            startTime: Math.floor(startTime / 1000),
            endTime: Math.floor(endTime / 1000)
        };
        
        if (entityId) {
            query += ` AND o.entity_id = @entityId`;
            params.entityId = entityId;
        }
        
        query += ` ORDER BY o.timestamp DESC LIMIT @limit`;
        params.limit = limit;
        
        const observations = this.db.prepare(query).all(params);
        
        return observations.map(obs => ({
            ...obs,
            context: this.parseJSON(obs.context),
            timestamp_formatted: this.formatDate(obs.timestamp)
        }));
    }

    /**
     * Get observation statistics
     */
    getStats(entityId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_observations,
                AVG(importance) as avg_importance,
                MAX(importance) as max_importance,
                MIN(timestamp) as oldest_observation,
                MAX(timestamp) as newest_observation
            FROM observations
        `;
        
        const params = {};
        
        if (entityId) {
            query += ` WHERE entity_id = @entityId`;
            params.entityId = entityId;
        }
        
        const stats = this.db.prepare(query).get(params);
        
        return {
            ...stats,
            oldest_observation: stats.oldest_observation ? this.formatDate(stats.oldest_observation) : null,
            newest_observation: stats.newest_observation ? this.formatDate(stats.newest_observation) : null
        };
    }

    /**
     * Get observations grouped by entity
     */
    getGroupedByEntity(limit = 10) {
        const query = `
            SELECT 
                e.id as entity_id,
                e.name as entity_name,
                e.type as entity_type,
                COUNT(o.id) as observation_count,
                MAX(o.timestamp) as last_observation,
                AVG(o.importance) as avg_importance
            FROM entities e
            JOIN observations o ON e.id = o.entity_id
            GROUP BY e.id
            ORDER BY observation_count DESC
            LIMIT @limit
        `;
        
        const results = this.db.prepare(query).all({ limit });
        
        return results.map(result => ({
            ...result,
            last_observation: this.formatDate(result.last_observation)
        }));
    }

    /**
     * Clean up old observations
     */
    cleanupOld(daysToKeep = 90, importanceThreshold = 0.3) {
        const cutoff = Math.floor((Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)) / 1000);
        
        const result = this.preparedStatements.deleteOld.run({
            cutoff,
            importance_threshold: importanceThreshold
        });
        
        return result.changes;
    }

    /**
     * Bulk create observations
     */
    bulkCreate(observations) {
        return this.transaction(() => {
            const created = [];
            for (const obs of observations) {
                created.push(this.create(obs.entity_id, obs.content, {
                    context: obs.context,
                    importance: obs.importance
                }));
            }
            return created;
        });
    }

    /**
     * Get timeline of observations
     */
    getTimeline(options = {}) {
        const { 
            entityIds = [], 
            startTime = null, 
            endTime = null, 
            limit = 100 
        } = options;
        
        let query = `
            SELECT o.*, e.name as entity_name, e.type as entity_type
            FROM observations o
            JOIN entities e ON o.entity_id = e.id
            WHERE 1=1
        `;
        
        const params = { limit };
        
        if (entityIds.length > 0) {
            query += ` AND o.entity_id IN (${entityIds.map(() => '?').join(',')})`;
        }
        
        if (startTime) {
            query += ` AND o.timestamp >= @startTime`;
            params.startTime = Math.floor(startTime / 1000);
        }
        
        if (endTime) {
            query += ` AND o.timestamp <= @endTime`;
            params.endTime = Math.floor(endTime / 1000);
        }
        
        query += ` ORDER BY o.timestamp DESC LIMIT @limit`;
        
        const stmt = entityIds.length > 0 
            ? this.db.prepare(query) 
            : this.db.prepare(query);
            
        const observations = entityIds.length > 0
            ? stmt.all(...entityIds, params)
            : stmt.all(params);
        
        return observations.map(obs => ({
            ...obs,
            context: this.parseJSON(obs.context),
            timestamp_formatted: this.formatDate(obs.timestamp)
        }));
    }
}

module.exports = ObservationRepository;