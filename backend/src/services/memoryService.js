const fs = require('fs').promises;
const path = require('path');
const { FileSystemError, NotFoundError, ConflictError } = require('../utils/errors');

class MemoryService {
  constructor(memoryPath) {
    this.memoryPath = memoryPath;
    this.lockFile = `${memoryPath}.lock`;
    this.isLocked = false;
  }

  /**
   * Acquire lock for file operations
   */
  async acquireLock(maxWaitTime = 5000) {
    const startTime = Date.now();
    
    while (this.isLocked) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new FileSystemError('Timeout waiting for file lock');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isLocked = true;
  }

  /**
   * Release lock
   */
  releaseLock() {
    this.isLocked = false;
  }

  /**
   * Parse JSONL text into objects
   */
  parseJSONL(jsonlText) {
    try {
      const lines = jsonlText.trim().split('\n').filter(line => line.trim());
      return lines.map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (err) {
          throw new FileSystemError(`Invalid JSON at line ${index + 1}: ${err.message}`);
        }
      });
    } catch (err) {
      if (err instanceof FileSystemError) throw err;
      throw new FileSystemError(`Failed to parse JSONL: ${err.message}`);
    }
  }

  /**
   * Convert JSONL data to JSON format
   */
  convertToJSON(jsonlData) {
    const entities = [];
    const relations = [];
    
    jsonlData.forEach(item => {
      if (item.type === 'entity') {
        entities.push({
          name: item.name,
          entityType: item.entityType,
          observations: item.observations || [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        });
      } else if (item.type === 'relation') {
        relations.push({
          from: item.from,
          to: item.to,
          relationType: item.relationType,
          createdAt: item.createdAt
        });
      }
    });
    
    return { entities, relations };
  }

  /**
   * Convert JSON to JSONL format
   */
  convertToJSONL(entities, relations) {
    const lines = [];
    
    entities.forEach(entity => {
      lines.push(JSON.stringify({
        type: 'entity',
        name: entity.name,
        entityType: entity.entityType,
        observations: entity.observations || [],
        createdAt: entity.createdAt || new Date().toISOString(),
        updatedAt: entity.updatedAt || new Date().toISOString()
      }));
    });
    
    relations.forEach(relation => {
      lines.push(JSON.stringify({
        type: 'relation',
        from: relation.from,
        to: relation.to,
        relationType: relation.relationType,
        createdAt: relation.createdAt || new Date().toISOString()
      }));
    });
    
    return lines.join('\n');
  }

  /**
   * Read memory from file
   */
  async readMemory() {
    try {
      await this.acquireLock();
      const data = await fs.readFile(this.memoryPath, 'utf8');
      const jsonlData = this.parseJSONL(data);
      return this.convertToJSON(jsonlData);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Initialize empty memory if file doesn't exist
        return { entities: [], relations: [] };
      }
      throw new FileSystemError(`Failed to read memory: ${err.message}`);
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Write memory to file
   */
  async writeMemory(memory) {
    try {
      await this.acquireLock();
      
      // Create backup before writing
      try {
        await fs.copyFile(this.memoryPath, `${this.memoryPath}.backup`);
      } catch (err) {
        // Ignore backup errors for new files
      }
      
      const jsonl = this.convertToJSONL(memory.entities, memory.relations);
      
      // Ensure directory exists
      const dir = path.dirname(this.memoryPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write atomically
      const tempFile = `${this.memoryPath}.tmp`;
      await fs.writeFile(tempFile, jsonl);
      await fs.rename(tempFile, this.memoryPath);
      
    } catch (err) {
      throw new FileSystemError(`Failed to write memory: ${err.message}`);
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Create entities
   */
  async createEntities(entities) {
    const memory = await this.readMemory();
    const created = [];
    const conflicts = [];
    
    entities.forEach(entity => {
      if (memory.entities.find(e => e.name === entity.name)) {
        conflicts.push(entity.name);
      } else {
        const newEntity = {
          ...entity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        memory.entities.push(newEntity);
        created.push(newEntity);
      }
    });
    
    if (conflicts.length > 0) {
      throw new ConflictError(`Entities already exist: ${conflicts.join(', ')}`);
    }
    
    await this.writeMemory(memory);
    return created;
  }

  /**
   * Create relations
   */
  async createRelations(relations) {
    const memory = await this.readMemory();
    const created = [];
    const errors = [];
    
    relations.forEach(relation => {
      // Validate entities exist
      const fromExists = memory.entities.find(e => e.name === relation.from);
      const toExists = memory.entities.find(e => e.name === relation.to);
      
      if (!fromExists) {
        errors.push(`Entity '${relation.from}' not found`);
      }
      if (!toExists) {
        errors.push(`Entity '${relation.to}' not found`);
      }
      
      if (fromExists && toExists) {
        const newRelation = {
          ...relation,
          createdAt: new Date().toISOString()
        };
        memory.relations.push(newRelation);
        created.push(newRelation);
      }
    });
    
    if (errors.length > 0) {
      throw new NotFoundError(errors.join('; '));
    }
    
    await this.writeMemory(memory);
    return created;
  }

  /**
   * Delete entity and its relations
   */
  async deleteEntity(name) {
    const memory = await this.readMemory();
    
    const entity = memory.entities.find(e => e.name === name);
    if (!entity) {
      throw new NotFoundError(`Entity '${name}'`);
    }
    
    // Remove entity and related relations
    memory.entities = memory.entities.filter(e => e.name !== name);
    const deletedRelations = memory.relations.filter(r => r.from === name || r.to === name);
    memory.relations = memory.relations.filter(r => r.from !== name && r.to !== name);
    
    await this.writeMemory(memory);
    
    return {
      entity,
      deletedRelations: deletedRelations.length
    };
  }

  /**
   * Update entity observations
   */
  async updateEntityObservations(name, observations) {
    const memory = await this.readMemory();
    
    const entity = memory.entities.find(e => e.name === name);
    if (!entity) {
      throw new NotFoundError(`Entity '${name}'`);
    }
    
    entity.observations = [...(entity.observations || []), ...observations];
    entity.updatedAt = new Date().toISOString();
    
    await this.writeMemory(memory);
    return entity;
  }

  /**
   * Search entities by query
   */
  async searchEntities(query) {
    const memory = await this.readMemory();
    const lowerQuery = query.toLowerCase();
    
    return memory.entities.filter(entity => 
      entity.name.toLowerCase().includes(lowerQuery) ||
      entity.entityType.toLowerCase().includes(lowerQuery) ||
      (entity.observations && entity.observations.some(obs => 
        obs.toLowerCase().includes(lowerQuery)
      ))
    );
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: (memoryPath) => {
    if (!instance) {
      instance = new MemoryService(memoryPath);
    }
    return instance;
  },
  MemoryService
};