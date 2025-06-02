const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../middleware/validation');
const EmbeddingService = require('../../services/embeddingService');

/**
 * Memory API v2 Routes
 * Enhanced routes with direct SQLite repository access
 */

module.exports = (repositoryManager, io = null) => {
  const entityRepo = repositoryManager.entities;
  const relationRepo = repositoryManager.relations;
  const observationRepo = repositoryManager.observations;
  
  // Initialize embedding service
  const embeddingService = new EmbeddingService();

  // List all entities with pagination and filtering
  router.get('/entities', asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      search,
      sortBy = 'updated_at',
      sortOrder = 'desc' 
    } = req.query;

    // Use repository methods instead of raw SQL
    let entities;
    
    if (search) {
      entities = entityRepo.search(search);
    } else {
      entities = entityRepo.findAll();
    }
    
    // Filter by type if specified
    if (type) {
      entities = entities.filter(entity => entity.type === type);
    }
    
    // Sort entities
    entities.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      
      // Handle different data types
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder.toLowerCase() === 'desc' ? bVal - aVal : aVal - bVal;
      } else {
        // Convert to string for comparison
        const aStr = String(aVal);
        const bStr = String(bVal);
        if (sortOrder.toLowerCase() === 'desc') {
          return bStr.localeCompare(aStr);
        } else {
          return aStr.localeCompare(bStr);
        }
      }
    });
    
    const total = entities.length;
    const offset = (page - 1) * limit;
    const paginatedEntities = entities.slice(offset, offset + parseInt(limit));
    
    res.json({
      entities: paginatedEntities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }));

  // Get single entity with full details
  router.get('/entities/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { includeRelations = true, includeObservations = true } = req.query;
    
    const entity = entityRepo.findById(id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    const response = {
      ...entity
    };
    
    if (includeRelations === 'true') {
      const relations = relationRepo.findByEntity(id);
      response.relations = relations.map(rel => ({
        id: rel.id,
        type: rel.type,
        strength: rel.strength,
        targetEntity: {
          id: rel.source_id === id ? rel.target_id : rel.source_id,
          name: rel.source_id === id ? rel.target_name : rel.source_name,
          type: rel.source_id === id ? rel.target_type : rel.source_type
        }
      }));
    }
    
    if (includeObservations === 'true') {
      response.observations = observationRepo.findByEntity(id);
    }
    
    res.json(response);
  }));

  // Create new entity
  router.post('/entities', 
    validate('createEntity'),
    asyncHandler(async (req, res) => {
      const { name, type, metadata = {} } = req.body;
      
      // Check if entity already exists
      const existing = await entityRepo.findByName(name);
      if (existing) {
        return res.status(409).json({ 
          error: 'Entity already exists',
          entity: existing 
        });
      }
      
      const entity = await entityRepo.create({
        name,
        type,
        metadata
      });
      
      // Emit WebSocket event for real-time updates
      if (io) {
        io.emit('entity:created', {
          entity,
          timestamp: Date.now(),
          source: 'api'
        });
      }
      
      res.status(201).json(entity);
    })
  );

  // Update entity
  router.put('/entities/:id', 
    validate('updateEntity'),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const updates = req.body;
      
      try {
        const updated = entityRepo.update(id, updates);
        
        // Emit WebSocket event for real-time updates
        if (io) {
          io.emit('entity:updated', {
            entity: updated,
            changes: updates,
            timestamp: Date.now(),
            source: 'api'
          });
        }
        
        res.json(updated);
      } catch (error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: 'Entity not found' });
        }
        throw error;
      }
    })
  );

  // Delete entity
  router.delete('/entities/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Get entity before deleting for response
    const entity = entityRepo.findById(id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Count relations to be deleted
    const relations = relationRepo.findByEntity(id);
    const relationsDeleted = relations.length;
    
    // Delete relations first
    for (const relation of relations) {
      relationRepo.delete(relation.id);
    }
    
    // Delete entity
    const success = await entityRepo.delete(id);
    
    // Emit WebSocket event for real-time updates
    if (io) {
      io.emit('entity:deleted', {
        entityId: id,
        entity,
        relationsDeleted,
        timestamp: Date.now(),
        source: 'api'
      });
    }
    
    res.json({
      deleted: true,
      entity,
      relationsDeleted
    });
  }));

  // Get related entities with depth control
  router.get('/entities/:id/related', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { depth = 1, limit = 50 } = req.query;
    
    const entity = await entityRepo.findById(id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    const relatedEntities = await relationRepo.getRelatedEntities(id, {
      depth: parseInt(depth),
      limit: parseInt(limit)
    });
    
    res.json({
      entity,
      related: relatedEntities,
      depth: parseInt(depth)
    });
  }));

  // Create observation for entity
  router.post('/entities/:id/observations', 
    validate('createObservation'),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { content, importance = 50 } = req.body;
      
      const entity = await entityRepo.findById(id);
      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }
      
      const observation = await observationRepo.create(id, content, {
        importance
      });
      
      // Emit WebSocket event for real-time updates
      if (io) {
        io.emit('observation:created', {
          observation,
          entityId: id,
          timestamp: Date.now(),
          source: 'api'
        });
      }
      
      res.status(201).json(observation);
    })
  );

  // List all relations with filtering
  router.get('/relations', asyncHandler(async (req, res) => {
    const { source_id, target_id, type, limit = 100 } = req.query;
    
    const conditions = [];
    const params = [];
    
    if (source_id) {
      conditions.push('source_id = ?');
      params.push(source_id);
    }
    
    if (target_id) {
      conditions.push('target_id = ?');
      params.push(target_id);
    }
    
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const query = `
      SELECT r.*, 
             e1.name as from_name, e1.type as from_type,
             e2.name as to_name, e2.type as to_type
      FROM relations r
      JOIN entities e1 ON r.source_id = e1.id
      JOIN entities e2 ON r.target_id = e2.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ?
    `;
    
    const relations = relationRepo.db.prepare(query).all(...params, limit);
    
    res.json({
      relations: relations.map(r => ({
        ...r,
        metadata: JSON.parse(r.metadata || '{}')
      }))
    });
  }));

  // Create relation
  router.post('/relations', 
    validate('createRelation'),
    asyncHandler(async (req, res) => {
      const { sourceId, targetId, type, strength = 0.5, metadata = {} } = req.body;
      
      // Verify both entities exist
      const fromEntity = entityRepo.findById(sourceId);
      const toEntity = entityRepo.findById(targetId);
      
      if (!fromEntity || !toEntity) {
        return res.status(404).json({ 
          error: 'One or both entities not found',
          missing: {
            from: !fromEntity,
            to: !toEntity
          }
        });
      }
      
      const relation = relationRepo.create(
        sourceId,
        targetId,
        type,
        strength,
        metadata
      );
      
      // Format response to match expected API format
      const formattedRelation = {
        ...relation,
        sourceId: relation.source_id,
        targetId: relation.target_id,
        metadata: JSON.parse(relation.metadata || '{}')
      };
      delete formattedRelation.source_id;
      delete formattedRelation.target_id;
      
      // Emit WebSocket event for real-time updates
      if (io) {
        io.emit('relation:created', {
          relation: formattedRelation,
          timestamp: Date.now(),
          source: 'api'
        });
      }
      
      res.status(201).json(formattedRelation);
    })
  );

  // Delete relation
  router.delete('/relations/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Get relation before deleting for WebSocket event
    const relation = relationRepo.findById(id);
    
    const success = await relationRepo.delete(id);
    if (!success) {
      return res.status(404).json({ error: 'Relation not found' });
    }
    
    // Emit WebSocket event for real-time updates
    if (io && relation) {
      io.emit('relation:deleted', {
        relationId: id,
        relation,
        timestamp: Date.now(),
        source: 'api'
      });
    }
    
    res.status(204).send();
  }));

  // Enhanced search with multiple strategies including semantic search
  router.get('/search', asyncHandler(async (req, res) => {
    const { q, type, strategy = 'hybrid', limit = 50, threshold = 0.1 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    if (q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters long' });
    }
    
    let results;
    const searchLimit = parseInt(limit);
    const searchThreshold = parseFloat(threshold);
    
    // Traditional search function for hybrid approach
    const traditionalSearch = async (query, entities, options = {}) => {
      let searchResults;
      const searchStrategy = options.strategy || 'fuzzy';
      
      switch (searchStrategy) {
        case 'exact':
          searchResults = entityRepo.search(query, searchLimit);
          break;
        case 'prefix':
          searchResults = entityRepo.search(`${query}%`, searchLimit);
          break;
        case 'fuzzy':
        default:
          searchResults = entityRepo.search(`%${query}%`, searchLimit);
      }
      
      // Add relevance scoring based on match position
      return searchResults.map(entity => {
        const nameIndex = entity.name.toLowerCase().indexOf(query.toLowerCase());
        const descIndex = entity.description ? 
          entity.description.toLowerCase().indexOf(query.toLowerCase()) : -1;
        
        let relevance = 60; // Base relevance
        if (nameIndex === 0) relevance = 100; // Exact name start match
        else if (nameIndex > 0) relevance = 80; // Name contains
        else if (descIndex >= 0) relevance = 70; // Description contains
        
        return {
          ...entity,
          _relevance: relevance
        };
      });
    };
    
    switch (strategy) {
      case 'semantic':
        if (embeddingService.isAvailable()) {
          // Get all entities for semantic search
          const allEntities = entityRepo.getEntitiesWithEmbeddings();
          results = await embeddingService.semanticSearch(q, allEntities, {
            limit: searchLimit,
            threshold: searchThreshold
          });
        } else {
          return res.status(503).json({ 
            error: 'Semantic search not available - no OpenAI API key configured' 
          });
        }
        break;
        
      case 'hybrid':
        if (embeddingService.isAvailable()) {
          // Get all entities for hybrid search
          const allEntities = entityRepo.findAll(1000); // Get more for better hybrid results
          results = await embeddingService.hybridSearch(
            q, 
            allEntities, 
            traditionalSearch,
            { 
              limit: searchLimit,
              semanticWeight: 0.7,
              traditionalWeight: 0.3
            }
          );
        } else {
          // Fallback to traditional search
          results = await traditionalSearch(q, null, { strategy: 'fuzzy' });
        }
        break;
        
      case 'exact':
        results = await traditionalSearch(q, null, { strategy: 'exact' });
        break;
      case 'prefix':
        results = await traditionalSearch(q, null, { strategy: 'prefix' });
        break;
      case 'fuzzy':
      default:
        results = await traditionalSearch(q, null, { strategy: 'fuzzy' });
    }
    
    // Filter by type if specified
    if (type) {
      results = results.filter(entity => entity.type === type);
    }
    
    // Sort by relevance/semantic score then importance
    results.sort((a, b) => {
      const aScore = a._relevance || a._semanticScore * 100 || 0;
      const bScore = b._relevance || b._semanticScore * 100 || 0;
      
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      return (b.importance_score || 0) - (a.importance_score || 0);
    });
    
    res.json({
      query: q,
      strategy,
      semanticEnabled: embeddingService.isAvailable(),
      embeddingStats: embeddingService.isAvailable() ? entityRepo.getEmbeddingStats() : null,
      results: results.slice(0, searchLimit),
      count: results.length
    });
  }));

  // Get memory statistics
  router.get('/stats', asyncHandler(async (req, res) => {
    const stats = {
      entities: {
        total: entityRepo.db.prepare('SELECT COUNT(*) as count FROM entities').get().count,
        byType: entityRepo.db.prepare(
          'SELECT type, COUNT(*) as count FROM entities GROUP BY type'
        ).all().reduce((acc, row) => {
          acc[row.type] = row.count;
          return acc;
        }, {})
      },
      relations: {
        total: relationRepo.db.prepare('SELECT COUNT(*) as count FROM relations').get().count,
        byType: relationRepo.db.prepare(
          'SELECT type, COUNT(*) as count FROM relations GROUP BY type'
        ).all()
      },
      observations: {
        total: observationRepo.db.prepare('SELECT COUNT(*) as count FROM observations').get().count,
        recent: observationRepo.db.prepare(
          "SELECT COUNT(*) as count FROM observations WHERE timestamp > strftime('%s', 'now', '-7 days')"
        ).get().count
      },
      storage: {
        mode: 'sqlite',
        performance: '<10ms query time',
        capacity: '100,000+ entities'
      }
    };
    
    res.json(stats);
  }));

  // Embedding management endpoints
  
  // Generate embeddings for entities without them
  router.post('/embeddings/generate', asyncHandler(async (req, res) => {
    if (!embeddingService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Embedding service not available - no OpenAI API key configured' 
      });
    }

    const { limit = 10, entityIds = null } = req.body;
    
    try {
      let entitiesToProcess;
      
      if (entityIds && Array.isArray(entityIds)) {
        // Process specific entities
        entitiesToProcess = entityIds.map(id => entityRepo.findById(id)).filter(Boolean);
      } else {
        // Process entities without embeddings
        entitiesToProcess = entityRepo.getEntitiesWithoutEmbeddings(limit);
      }

      const results = [];
      const errors = [];

      for (const entity of entitiesToProcess) {
        try {
          console.log(`🧠 Generating embedding for: ${entity.name}`);
          const embedding = await embeddingService.generateEntityEmbedding(entity);
          
          // Update entity with embedding
          const success = entityRepo.updateEmbedding(entity.id, embedding);
          
          if (success) {
            results.push({
              id: entity.id,
              name: entity.name,
              status: 'success',
              embeddingLength: embedding.length
            });
          } else {
            errors.push({
              id: entity.id,
              name: entity.name,
              error: 'Database update failed'
            });
          }
        } catch (error) {
          console.error(`❌ Failed to generate embedding for ${entity.name}:`, error.message);
          errors.push({
            id: entity.id,
            name: entity.name,
            error: error.message
          });
        }
      }

      res.json({
        processed: results.length + errors.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors,
        embeddingStats: entityRepo.getEmbeddingStats()
      });
    } catch (error) {
      console.error('❌ Embedding generation batch failed:', error);
      res.status(500).json({ error: 'Embedding generation failed', details: error.message });
    }
  }));

  // Get embedding statistics and status
  router.get('/embeddings/stats', asyncHandler(async (req, res) => {
    const stats = entityRepo.getEmbeddingStats();
    const serviceStatus = embeddingService.getStatus();
    
    res.json({
      service: serviceStatus,
      entities: stats,
      recommendations: {
        shouldGenerate: stats.withoutEmbeddings > 0,
        batchSize: Math.min(stats.withoutEmbeddings, 20)
      }
    });
  }));

  // Regenerate embedding for specific entity
  router.post('/entities/:id/embedding', asyncHandler(async (req, res) => {
    if (!embeddingService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Embedding service not available - no OpenAI API key configured' 
      });
    }

    const { id } = req.params;
    const entity = entityRepo.findById(id);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    try {
      const embedding = await embeddingService.generateEntityEmbedding(entity);
      const success = entityRepo.updateEmbedding(id, embedding);
      
      if (success) {
        res.json({
          id,
          name: entity.name,
          status: 'success',
          embeddingLength: embedding.length,
          generatedAt: new Date().toISOString()
        });
      } else {
        res.status(500).json({ error: 'Failed to update entity with embedding' });
      }
    } catch (error) {
      console.error(`❌ Failed to generate embedding for ${entity.name}:`, error.message);
      res.status(500).json({ error: 'Embedding generation failed', details: error.message });
    }
  }));

  return router;
};