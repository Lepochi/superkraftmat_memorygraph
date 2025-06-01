const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../middleware/validation');

/**
 * Memory API v2 Routes
 * Enhanced routes with direct SQLite repository access
 */

module.exports = (repositoryManager, io = null) => {
  const entityRepo = repositoryManager.entities;
  const relationRepo = repositoryManager.relations;
  const observationRepo = repositoryManager.observations;

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

  // Enhanced search with multiple strategies
  router.get('/search', asyncHandler(async (req, res) => {
    const { q, type, strategy = 'fuzzy', limit = 50 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    if (q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters long' });
    }
    
    let results;
    
    switch (strategy) {
      case 'exact':
        results = entityRepo.search(q, parseInt(limit));
        break;
      case 'prefix':
        results = entityRepo.search(`${q}%`, parseInt(limit));
        break;
      case 'fuzzy':
      default:
        results = entityRepo.search(`%${q}%`, parseInt(limit));
    }
    
    // Filter by type if specified
    if (type) {
      results = results.filter(entity => entity.type === type);
    }
    
    // Add relevance scoring based on match position
    const scoredResults = results.map(entity => {
      const nameIndex = entity.name.toLowerCase().indexOf(q.toLowerCase());
      const relevance = nameIndex === 0 ? 100 : nameIndex > 0 ? 80 : 60;
      
      return {
        ...entity,
        _relevance: relevance
      };
    });
    
    // Sort by relevance then importance
    scoredResults.sort((a, b) => {
      if (a._relevance !== b._relevance) {
        return b._relevance - a._relevance;
      }
      return b.importance_score - a.importance_score;
    });
    
    res.json({
      query: q,
      strategy,
      results: scoredResults,
      count: scoredResults.length
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

  return router;
};