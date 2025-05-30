const BaseRepository = require('./BaseRepository');

/**
 * Repository for managing relations between entities
 */
class RelationRepository extends BaseRepository {
    constructor(db) {
        super(db, 'relations');
        this.preparedStatements = this.prepareStatements();
    }

    /**
     * Prepare commonly used statements
     */
    prepareStatements() {
        return {
            create: this.db.prepare(`
                INSERT INTO relations (source_id, target_id, type, strength, metadata)
                VALUES (@source_id, @target_id, @type, @strength, @metadata)
            `),
            
            findByEntity: this.db.prepare(`
                SELECT r.*, 
                       e1.name as source_name, e1.type as source_type,
                       e2.name as target_name, e2.type as target_type
                FROM relations r
                JOIN entities e1 ON r.source_id = e1.id
                JOIN entities e2 ON r.target_id = e2.id
                WHERE r.source_id = @id OR r.target_id = @id
                ORDER BY r.strength DESC
            `),
            
            findByType: this.db.prepare(`
                SELECT r.*, 
                       e1.name as source_name, e1.type as source_type,
                       e2.name as target_name, e2.type as target_type
                FROM relations r
                JOIN entities e1 ON r.source_id = e1.id
                JOIN entities e2 ON r.target_id = e2.id
                WHERE r.type = @type
                ORDER BY r.strength DESC
                LIMIT @limit
            `),
            
            findBetween: this.db.prepare(`
                SELECT * FROM relations
                WHERE (source_id = @id1 AND target_id = @id2)
                   OR (source_id = @id2 AND target_id = @id1)
            `),
            
            updateStrength: this.db.prepare(`
                UPDATE relations 
                SET strength = @strength 
                WHERE id = @id
            `),
            
            deleteRelation: this.db.prepare(`
                DELETE FROM relations 
                WHERE source_id = @source_id 
                  AND target_id = @target_id 
                  AND type = @type
            `)
        };
    }

    /**
     * Create a new relation between entities
     */
    create(sourceId, targetId, type = 'relates_to', strength = 0.5, metadata = {}) {
        try {
            const result = this.preparedStatements.create.run({
                source_id: sourceId,
                target_id: targetId,
                type,
                strength,
                metadata: JSON.stringify(metadata)
            });
            
            return this.findById(result.lastInsertRowid);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('Relation already exists between these entities');
            }
            throw error;
        }
    }

    /**
     * Connect two entities (alias for create)
     */
    connect(sourceId, targetId, type, strength) {
        return this.create(sourceId, targetId, type, strength);
    }

    /**
     * Find all relations for an entity
     */
    findByEntity(entityId, options = {}) {
        const relations = this.preparedStatements.findByEntity.all({ id: entityId });
        
        if (options.direction) {
            return relations.filter(r => {
                if (options.direction === 'outgoing') {
                    return r.source_id === entityId;
                } else if (options.direction === 'incoming') {
                    return r.target_id === entityId;
                }
                return true;
            });
        }
        
        return relations;
    }

    /**
     * Find relations by type
     */
    findByType(type, limit = 100) {
        return this.preparedStatements.findByType.all({ type, limit });
    }

    /**
     * Find all connected entities (1 hop)
     */
    findConnected(entityId, options = {}) {
        const { type, minStrength = 0 } = options;
        
        let query = `
            SELECT DISTINCT 
                CASE 
                    WHEN r.source_id = @id THEN e2.id
                    ELSE e1.id
                END as entity_id,
                CASE 
                    WHEN r.source_id = @id THEN e2.name
                    ELSE e1.name
                END as entity_name,
                CASE 
                    WHEN r.source_id = @id THEN e2.type
                    ELSE e1.type
                END as entity_type,
                r.type as relation_type,
                r.strength as relation_strength
            FROM relations r
            JOIN entities e1 ON r.source_id = e1.id
            JOIN entities e2 ON r.target_id = e2.id
            WHERE (r.source_id = @id OR r.target_id = @id)
              AND r.strength >= @minStrength
        `;
        
        if (type) {
            query += ` AND r.type = @type`;
        }
        
        query += ` ORDER BY r.strength DESC`;
        
        const stmt = this.db.prepare(query);
        return stmt.all({ id: entityId, minStrength, type });
    }

    /**
     * Find path between two entities (up to specified depth)
     */
    findPath(startId, endId, maxDepth = 3) {
        // Simple BFS implementation for finding paths
        const visited = new Set();
        const queue = [{
            entityId: startId,
            path: [startId],
            depth: 0
        }];
        
        while (queue.length > 0) {
            const { entityId, path, depth } = queue.shift();
            
            if (entityId === endId) {
                return this.buildPathDetails(path);
            }
            
            if (depth >= maxDepth || visited.has(entityId)) {
                continue;
            }
            
            visited.add(entityId);
            
            const relations = this.findByEntity(entityId);
            for (const relation of relations) {
                const nextId = relation.source_id === entityId 
                    ? relation.target_id 
                    : relation.source_id;
                
                if (!path.includes(nextId)) {
                    queue.push({
                        entityId: nextId,
                        path: [...path, nextId],
                        depth: depth + 1
                    });
                }
            }
        }
        
        return null; // No path found
    }

    /**
     * Build detailed path information
     */
    buildPathDetails(entityIds) {
        const path = [];
        
        for (let i = 0; i < entityIds.length - 1; i++) {
            const relations = this.preparedStatements.findBetween.all({
                id1: entityIds[i],
                id2: entityIds[i + 1]
            });
            
            if (relations.length > 0) {
                const entity = this.db.prepare('SELECT * FROM entities WHERE id = ?')
                    .get(entityIds[i]);
                path.push({
                    entity,
                    relation: relations[0]
                });
            }
        }
        
        // Add the last entity
        const lastEntity = this.db.prepare('SELECT * FROM entities WHERE id = ?')
            .get(entityIds[entityIds.length - 1]);
        path.push({ entity: lastEntity, relation: null });
        
        return path;
    }

    /**
     * Find strongly connected entities (high strength relations)
     */
    findStronglyConnected(entityId, threshold = 0.7) {
        return this.findConnected(entityId, { minStrength: threshold });
    }

    /**
     * Update relation strength
     */
    updateStrength(relationId, strength) {
        if (strength < 0 || strength > 1) {
            throw new Error('Strength must be between 0 and 1');
        }
        
        const result = this.preparedStatements.updateStrength.run({
            id: relationId,
            strength
        });
        
        return result.changes > 0;
    }

    /**
     * Delete a specific relation
     */
    deleteRelation(sourceId, targetId, type) {
        const result = this.preparedStatements.deleteRelation.run({
            source_id: sourceId,
            target_id: targetId,
            type
        });
        
        return result.changes > 0;
    }

    /**
     * Get relation statistics for an entity
     */
    getEntityRelationStats(entityId) {
        const stats = this.db.prepare(`
            SELECT 
                COUNT(*) as total_relations,
                COUNT(CASE WHEN source_id = @id THEN 1 END) as outgoing_relations,
                COUNT(CASE WHEN target_id = @id THEN 1 END) as incoming_relations,
                AVG(strength) as avg_strength,
                MAX(strength) as max_strength
            FROM relations
            WHERE source_id = @id OR target_id = @id
        `).get({ id: entityId });
        
        const byType = this.db.prepare(`
            SELECT type, COUNT(*) as count, AVG(strength) as avg_strength
            FROM relations
            WHERE source_id = @id OR target_id = @id
            GROUP BY type
        `).all({ id: entityId });
        
        return {
            ...stats,
            by_type: byType
        };
    }

    /**
     * Find entities within N hops
     */
    findWithinHops(entityId, hops = 2) {
        const results = new Map();
        const visited = new Set();
        
        const explore = (currentId, currentHop) => {
            if (currentHop > hops || visited.has(currentId)) return;
            visited.add(currentId);
            
            const relations = this.findByEntity(currentId);
            
            for (const relation of relations) {
                const connectedId = relation.source_id === currentId 
                    ? relation.target_id 
                    : relation.source_id;
                
                if (!results.has(connectedId) || results.get(connectedId).hop > currentHop) {
                    const entity = this.db.prepare('SELECT * FROM entities WHERE id = ?')
                        .get(connectedId);
                    
                    results.set(connectedId, {
                        entity,
                        hop: currentHop,
                        relation_type: relation.type,
                        relation_strength: relation.strength
                    });
                }
                
                explore(connectedId, currentHop + 1);
            }
        };
        
        explore(entityId, 1);
        results.delete(entityId); // Remove the starting entity
        
        return Array.from(results.values()).sort((a, b) => a.hop - b.hop);
    }
}

module.exports = RelationRepository;