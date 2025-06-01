const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../middleware/validation');

/**
 * Memory API v1 Routes
 * Legacy routes for backward compatibility
 */

module.exports = (memoryService) => {
  // Get all memory data
  router.get('/', asyncHandler(async (req, res) => {
    const memory = await memoryService.readMemory();
    res.json(memory);
  }));

  // Create entities
  router.post('/entities', 
    validate('createEntities'),
    asyncHandler(async (req, res) => {
      const created = await memoryService.createEntities(req.body.entities);
      res.status(201).json({ created });
    })
  );

  // Delete entity
  router.delete('/entities/:name', asyncHandler(async (req, res) => {
    const result = await memoryService.deleteEntity(req.params.name);
    res.json(result);
  }));

  // Update entity observations
  router.patch('/entities/:name/observations', 
    validate('updateObservations'),
    asyncHandler(async (req, res) => {
      const updated = await memoryService.updateEntityObservations(
        req.params.name, 
        req.body.observations
      );
      res.json(updated);
    })
  );

  // Create relations
  router.post('/relations', 
    validate('createRelations'),
    asyncHandler(async (req, res) => {
      const created = await memoryService.createRelations(req.body.relations);
      res.status(201).json({ created });
    })
  );

  // Search entities
  router.get('/search', asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const results = await memoryService.searchEntities(q);
    res.json({ results });
  }));

  return router;
};