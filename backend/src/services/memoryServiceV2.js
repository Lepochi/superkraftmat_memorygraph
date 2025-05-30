const RepositoryManager = require('../repositories/RepositoryManager');
const { NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Memory Service V2 - Uses SQLite repositories instead of JSONL
 * Maintains the same API interface for backwards compatibility
 */
class MemoryServiceV2 {
  constructor(dbPath = null) {
    this.repoManager = new RepositoryManager(dbPath);
    this.repoManager.initialize();
  }

  /**
   * Read memory from database (matches old API format)
   */
  async readMemory() {
    try {
      // Get all entities
      const entities = await this.repoManager.entities.findAll(1000);
      
      // Get all relations
      const relationsData = await this.repoManager.relations.findAll(1000);
      
      // Format entities to match old API
      const formattedEntities = await Promise.all(entities.map(async (entity) => {
        // Get observations for this entity
        const observations = await this.repoManager.observations.getHistory(entity.id);
        
        return {
          name: entity.name,
          entityType: this.repoManager.entities.parseJSON(entity.metadata).originalType || entity.type,
          observations: observations.map(o => o.content),
          createdAt: new Date(entity.created_at * 1000).toISOString(),
          updatedAt: new Date(entity.updated_at * 1000).toISOString()
        };
      }));
      
      // Format relations to match old API
      const formattedRelations = relationsData.map(relation => ({
        from: relation.source_name || relation.source_id,
        to: relation.target_name || relation.target_id,
        relationType: this.repoManager.relations.parseJSON(relation.metadata).originalType || relation.type,
        createdAt: new Date(relation.created_at * 1000).toISOString()
      }));
      
      return {
        entities: formattedEntities,
        relations: formattedRelations
      };
    } catch (err) {
      console.error('Failed to read memory:', err);
      return { entities: [], relations: [] };
    }
  }

  /**
   * Create entities
   */
  async createEntities(entities) {
    const created = [];
    const conflicts = [];
    
    for (const entity of entities) {
      // Check if entity exists
      const existing = await this.repoManager.entities.search(entity.name, 1);
      if (existing.length > 0 && existing[0].name === entity.name) {
        conflicts.push(entity.name);
        continue;
      }
      
      // Create entity
      const newEntity = await this.repoManager.entities.create({
        name: entity.name,
        type: this.mapEntityType(entity.entityType),
        description: entity.observations ? entity.observations[0] : '',
        metadata: {
          originalType: entity.entityType
        }
      });
      
      // Add observations
      if (entity.observations && entity.observations.length > 0) {
        for (const observation of entity.observations) {
          await this.repoManager.observations.create(newEntity.id, observation);
        }
      }
      
      created.push({
        name: newEntity.name,
        entityType: entity.entityType,
        observations: entity.observations || [],
        createdAt: new Date(newEntity.created_at * 1000).toISOString(),
        updatedAt: new Date(newEntity.updated_at * 1000).toISOString()
      });
    }
    
    if (conflicts.length > 0) {
      throw new ConflictError(`Entities already exist: ${conflicts.join(', ')}`);
    }
    
    return created;
  }

  /**
   * Create relations
   */
  async createRelations(relations) {
    const created = [];
    const errors = [];
    
    for (const relation of relations) {
      // Find entities by name
      const fromEntities = await this.repoManager.entities.search(relation.from, 1);
      const toEntities = await this.repoManager.entities.search(relation.to, 1);
      
      const fromEntity = fromEntities.find(e => e.name === relation.from);
      const toEntity = toEntities.find(e => e.name === relation.to);
      
      if (!fromEntity) {
        errors.push(`Entity '${relation.from}' not found`);
        continue;
      }
      if (!toEntity) {
        errors.push(`Entity '${relation.to}' not found`);
        continue;
      }
      
      // Create relation
      const newRelation = await this.repoManager.relations.create(
        fromEntity.id,
        toEntity.id,
        this.mapRelationType(relation.relationType),
        0.5,
        { originalType: relation.relationType }
      );
      
      created.push({
        from: relation.from,
        to: relation.to,
        relationType: relation.relationType,
        createdAt: new Date(newRelation.created_at * 1000).toISOString()
      });
    }
    
    if (errors.length > 0) {
      throw new NotFoundError(errors.join('; '));
    }
    
    return created;
  }

  /**
   * Delete entity and its relations
   */
  async deleteEntity(name) {
    // Find entity by name
    const entities = await this.repoManager.entities.search(name, 1);
    const entity = entities.find(e => e.name === name);
    
    if (!entity) {
      throw new NotFoundError(`Entity '${name}'`);
    }
    
    // Get relations before deletion
    const relations = await this.repoManager.relations.findByEntity(entity.id);
    
    // Delete entity (cascades to relations and observations)
    const deleted = await this.repoManager.entities.delete(entity.id);
    
    if (!deleted) {
      throw new Error('Failed to delete entity');
    }
    
    return {
      entity: {
        name: entity.name,
        entityType: this.repoManager.entities.parseJSON(entity.metadata).originalType || entity.type
      },
      deletedRelations: relations.length
    };
  }

  /**
   * Update entity observations
   */
  async updateEntityObservations(name, observations) {
    // Find entity by name
    const entities = await this.repoManager.entities.search(name, 1);
    const entity = entities.find(e => e.name === name);
    
    if (!entity) {
      throw new NotFoundError(`Entity '${name}'`);
    }
    
    // Add new observations
    for (const observation of observations) {
      await this.repoManager.observations.create(entity.id, observation);
    }
    
    // Update entity's updated_at
    await this.repoManager.entities.recordAccess(entity.id);
    
    // Get all observations
    const allObservations = await this.repoManager.observations.getHistory(entity.id);
    
    return {
      name: entity.name,
      entityType: this.repoManager.entities.parseJSON(entity.metadata).originalType || entity.type,
      observations: allObservations.map(o => o.content),
      createdAt: new Date(entity.created_at * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Search entities by query
   */
  async searchEntities(query) {
    // Search in entities
    const entityResults = await this.repoManager.entities.search(query, 50);
    
    // Search in observations
    const observationResults = await this.repoManager.observations.search(query, 50);
    
    // Get unique entity IDs from observation results
    const entityIdsFromObs = [...new Set(observationResults.map(o => o.entity_id))];
    
    // Get entities from observation matches
    const entitiesFromObs = await Promise.all(
      entityIdsFromObs.map(id => this.repoManager.entities.findById(id))
    );
    
    // Combine and deduplicate results
    const allEntities = [...entityResults];
    for (const entity of entitiesFromObs) {
      if (entity && !allEntities.find(e => e.id === entity.id)) {
        allEntities.push(entity);
      }
    }
    
    // Format results
    const formattedResults = await Promise.all(allEntities.map(async (entity) => {
      const observations = await this.repoManager.observations.getHistory(entity.id);
      
      return {
        name: entity.name,
        entityType: this.repoManager.entities.parseJSON(entity.metadata).originalType || entity.type,
        observations: observations.map(o => o.content),
        createdAt: new Date(entity.created_at * 1000).toISOString(),
        updatedAt: new Date(entity.updated_at * 1000).toISOString()
      };
    }));
    
    return formattedResults;
  }

  /**
   * Map old entity types to new schema
   */
  mapEntityType(oldType) {
    const typeMap = {
      'company': 'concept',
      'Company': 'concept',
      'project': 'task',
      'Project': 'task',
      'system': 'concept',
      'checkpoint': 'event',
      'reference': 'concept',
      'Person': 'person',
      'person': 'person',
      'research': 'concept',
      'milestone': 'event',
      'test': 'task',
      'bugfix': 'task'
    };
    
    return typeMap[oldType] || 'concept';
  }

  /**
   * Map old relation types to new schema
   */
  mapRelationType(oldType) {
    const typeMap = {
      'uses': 'requires',
      'includes': 'part_of',
      'organized_by': 'part_of',
      'tracked_by': 'relates_to',
      'documented_by': 'relates_to',
      'defines_structure_for': 'supports',
      'informs': 'supports',
      'implements': 'relates_to',
      'based_on': 'requires'
    };
    
    return typeMap[oldType] || 'relates_to';
  }

  /**
   * Close database connection
   */
  close() {
    this.repoManager.close();
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: (dbPath) => {
    if (!instance) {
      instance = new MemoryServiceV2(dbPath);
    }
    return instance;
  },
  MemoryServiceV2
};