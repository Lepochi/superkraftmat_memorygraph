const DatabaseManager = require('../database/DatabaseManager');
const EntityRepository = require('./EntityRepository');
const RelationRepository = require('./RelationRepository');
const ObservationRepository = require('./ObservationRepository');

/**
 * Central manager for all repositories
 * Provides a single point of access to all data operations
 */
class RepositoryManager {
    constructor(dbPath = null) {
        this.dbManager = new DatabaseManager(dbPath);
        this.repositories = {};
        this.initialized = false;
    }

    /**
     * Initialize all repositories
     */
    initialize() {
        if (this.initialized) return;
        
        // Connect to database
        this.dbManager.connect();
        
        // Initialize repositories
        this.repositories.entities = new EntityRepository(this.dbManager.db);
        this.repositories.relations = new RelationRepository(this.dbManager.db);
        this.repositories.observations = new ObservationRepository(this.dbManager.db);
        
        this.initialized = true;
        console.log('Repository Manager initialized');
    }

    /**
     * Get entity repository
     */
    get entities() {
        this.ensureInitialized();
        return this.repositories.entities;
    }

    /**
     * Get relation repository
     */
    get relations() {
        this.ensureInitialized();
        return this.repositories.relations;
    }

    /**
     * Get observation repository
     */
    get observations() {
        this.ensureInitialized();
        return this.repositories.observations;
    }

    /**
     * Ensure repositories are initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            this.initialize();
        }
    }

    /**
     * Execute a transaction across multiple repositories
     */
    transaction(callback) {
        this.ensureInitialized();
        return this.dbManager.transaction(callback);
    }

    /**
     * Get database statistics
     */
    getStats() {
        this.ensureInitialized();
        return this.dbManager.getStats();
    }

    /**
     * Complex query: Get complete memory context
     */
    getMemoryContext(options = {}) {
        this.ensureInitialized();
        
        const {
            entityTypes = [],
            importanceThreshold = 0.5,
            recentDays = 7,
            maxEntities = 50,
            includeRelations = true,
            includeObservations = true
        } = options;
        
        // Get important and recent entities
        let entities = this.entities.findImportant(importanceThreshold, maxEntities);
        
        // Filter by type if specified
        if (entityTypes.length > 0) {
            entities = entities.filter(e => entityTypes.includes(e.type));
        }
        
        // Get recent updates
        const recentCutoff = Date.now() - (recentDays * 24 * 60 * 60 * 1000);
        const recentObservations = this.observations.getByTimeRange(
            recentCutoff,
            Date.now(),
            { limit: 100 }
        );
        
        // Build context object
        const context = {
            entities: entities.map(e => ({
                ...e,
                metadata: this.entities.parseJSON(e.metadata)
            })),
            recent_activity: recentObservations
        };
        
        // Include relations if requested
        if (includeRelations) {
            const entityIds = entities.map(e => e.id);
            const relations = [];
            
            for (const id of entityIds) {
                const entityRelations = this.relations.findByEntity(id);
                relations.push(...entityRelations);
            }
            
            // Deduplicate relations
            const uniqueRelations = Array.from(
                new Map(relations.map(r => [`${r.source_id}-${r.target_id}-${r.type}`, r])).values()
            );
            
            context.relations = uniqueRelations;
        }
        
        return context;
    }

    /**
     * Search across all repositories
     */
    globalSearch(query, options = {}) {
        this.ensureInitialized();
        
        const { limit = 50 } = options;
        const results = {
            entities: [],
            observations: []
        };
        
        // Search entities
        results.entities = this.entities.search(query, limit);
        
        // Search observations
        results.observations = this.observations.search(query, limit);
        
        // Score and sort results by relevance
        const allResults = [
            ...results.entities.map(e => ({ type: 'entity', data: e, score: e.importance_score })),
            ...results.observations.map(o => ({ type: 'observation', data: o, score: o.importance }))
        ];
        
        allResults.sort((a, b) => b.score - a.score);
        
        return allResults.slice(0, limit);
    }

    /**
     * Get entity with full context (relations + observations)
     */
    getEntityWithContext(entityId) {
        this.ensureInitialized();
        return this.entities.getWithRelations(entityId);
    }

    /**
     * Create entity with observations
     */
    createEntityWithObservations(entityData, observations = []) {
        this.ensureInitialized();
        
        return this.transaction(() => {
            // Create entity
            const entity = this.entities.create(entityData);
            
            // Add observations
            const createdObservations = [];
            for (const obs of observations) {
                createdObservations.push(
                    this.observations.create(entity.id, obs.content, {
                        importance: obs.importance || 0.5
                    })
                );
            }
            
            return {
                entity,
                observations: createdObservations
            };
        });
    }

    /**
     * Backup database
     */
    async backup(backupPath) {
        this.ensureInitialized();
        return await this.dbManager.backup(backupPath);
    }

    /**
     * Optimize database
     */
    optimize() {
        this.ensureInitialized();
        return this.dbManager.optimize();
    }

    /**
     * Close all connections
     */
    close() {
        if (this.initialized) {
            this.dbManager.close();
            this.initialized = false;
        }
    }
}

// Export singleton instance
module.exports = RepositoryManager;