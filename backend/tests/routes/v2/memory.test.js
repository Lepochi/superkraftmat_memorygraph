const request = require('supertest');
const express = require('express');
const path = require('path');

// Set test environment before importing modules
process.env.NODE_ENV = 'test';
process.env.USE_SQLITE = 'true';
process.env.TEST_DB_PATH = ':memory:';
process.env.SQLITE_PATH = ':memory:';

describe('v2 Memory API Routes', () => {
  let app;
  let repositoryManager;

  beforeAll(async () => {
    // Import server after environment is set
    const serverModule = require('../../../src/server');
    app = serverModule.app;
    repositoryManager = serverModule.repositoryManager;
    
    // Ensure SQLite database is initialized
    if (repositoryManager) {
      await repositoryManager.initialize();
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    if (repositoryManager) {
      const entityRepo = repositoryManager.entities;
      const relationRepo = repositoryManager.relations;
      
      // Get all entities and relations, then delete them
      const entities = entityRepo.findAll();
      const relations = relationRepo.findAll();
      
      for (const relation of relations) {
        relationRepo.delete(relation.id);
      }
      
      for (const entity of entities) {
        entityRepo.delete(entity.id);
      }
    }
  });

  describe('GET /api/v2/memory/entities', () => {
    it('should return empty list when no entities exist', async () => {
      const response = await request(app)
        .get('/api/v2/memory/entities')
        .expect(200);

      expect(response.body).toMatchObject({
        entities: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        }
      });
    });

    it('should return entities with pagination', async () => {
      // Create test entities
      const entityRepo = repositoryManager.entities;
      const entity1 = entityRepo.create({ name: 'Entity1', type: 'task' });
      const entity2 = entityRepo.create({ name: 'Entity2', type: 'person' });

      const response = await request(app)
        .get('/api/v2/memory/entities')
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body).toMatchObject({
        entities: expect.arrayContaining([
          expect.objectContaining({ name: 'Entity1' })
        ]),
        pagination: {
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2
        }
      });
    });

    it('should filter entities by type', async () => {
      // Create test entities
      const entityRepo = repositoryManager.entities;
      entityRepo.create({ name: 'Project1', type: 'task' });
      entityRepo.create({ name: 'Person1', type: 'person' });

      const response = await request(app)
        .get('/api/v2/memory/entities')
        .query({ type: 'task' })
        .expect(200);

      expect(response.body).toMatchObject({
        entities: expect.arrayContaining([
          expect.objectContaining({ name: 'Project1', type: 'task' })
        ]),
        pagination: {
          total: 1
        }
      });
    });

    it('should sort entities by name', async () => {
      // Create test entities
      const entityRepo = repositoryManager.entities;
      entityRepo.create({ name: 'Charlie', type: 'person' });
      entityRepo.create({ name: 'Alice', type: 'person' });
      entityRepo.create({ name: 'Bob', type: 'person' });

      const response = await request(app)
        .get('/api/v2/memory/entities')
        .query({ sortBy: 'name', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.entities[0].name).toBe('Alice');
      expect(response.body.entities[1].name).toBe('Bob');
      expect(response.body.entities[2].name).toBe('Charlie');
    });
  });

  describe('GET /api/v2/memory/entities/:id', () => {
    it('should return entity by ID with relations and observations', async () => {
      const entityRepo = repositoryManager.entities;
      const relationRepo = repositoryManager.relations;
      const observationRepo = repositoryManager.observations;
      
      // Create entities
      const entity1 = entityRepo.create({ name: 'Entity1', type: 'task' });
      const entity2 = entityRepo.create({ name: 'Entity2', type: 'person' });
      
      // Create relation
      relationRepo.create(entity1.id, entity2.id, 'relates_to');
      
      // Create observation
      observationRepo.create(entity1.id, 'Test observation', { importance: 0.8 });

      const response = await request(app)
        .get(`/api/v2/memory/entities/${entity1.id}`)
        .query({ includeRelations: true, includeObservations: true })
        .expect(200);

      expect(response.body).toMatchObject({
        id: entity1.id,
        name: 'Entity1',
        type: 'task',
        relations: expect.arrayContaining([
          expect.objectContaining({
            type: 'relates_to',
            targetEntity: expect.objectContaining({ name: 'Entity2' })
          })
        ]),
        observations: expect.arrayContaining([
          expect.objectContaining({
            content: 'Test observation',
            importance: 0.8
          })
        ])
      });
    });

    it('should return 404 for non-existent entity', async () => {
      const response = await request(app)
        .get('/api/v2/memory/entities/99999')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/v2/memory/entities', () => {
    it('should create a new entity', async () => {
      const entityData = {
        name: 'Test Entity',
        type: 'task',
        metadata: { status: 'active' }
      };

      const response = await request(app)
        .post('/api/v2/memory/entities')
        .send(entityData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'Test Entity',
        type: 'task',
        metadata: { status: 'active' }
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v2/memory/entities')
        .send({ type: 'task' }) // missing name
        .expect(400);

      expect(response.body.error).toContain('Validation');
    });

    it('should reject duplicate entity names', async () => {
      const entityData = { name: 'Duplicate', type: 'task' };
      
      // Create first entity
      await request(app)
        .post('/api/v2/memory/entities')
        .send(entityData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v2/memory/entities')
        .send(entityData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('PUT /api/v2/memory/entities/:id', () => {
    it('should update an existing entity', async () => {
      const entityRepo = repositoryManager.entities;
      const entity = entityRepo.create({ name: 'Original', type: 'task' });

      const updateData = {
        name: 'Updated',
        metadata: { status: 'completed' }
      };

      const response = await request(app)
        .put(`/api/v2/memory/entities/${entity.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: entity.id,
        name: 'Updated',
        type: 'task',
        metadata: { status: 'completed' }
      });
    });

    it('should return 404 for non-existent entity', async () => {
      const response = await request(app)
        .put('/api/v2/memory/entities/99999')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/v2/memory/entities/:id', () => {
    it('should delete entity and its relations', async () => {
      const entityRepo = repositoryManager.entities;
      const relationRepo = repositoryManager.relations;
      
      const entity1 = entityRepo.create({ name: 'Entity1', type: 'task' });
      const entity2 = entityRepo.create({ name: 'Entity2', type: 'person' });
      
      relationRepo.create(entity1.id, entity2.id, 'relates_to');

      const response = await request(app)
        .delete(`/api/v2/memory/entities/${entity1.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        deleted: true,
        entity: expect.objectContaining({ name: 'Entity1' }),
        relationsDeleted: 1
      });

      // Verify entity is actually deleted
      expect(entityRepo.findById(entity1.id)).toBeNull();
    });
  });

  describe('GET /api/v2/memory/search', () => {
    beforeEach(async () => {
      // Create test data
      const entityRepo = repositoryManager.entities;
      entityRepo.create({ name: 'JavaScript Project', type: 'task' });
      entityRepo.create({ name: 'Python Script', type: 'task' });
      entityRepo.create({ name: 'John Smith', type: 'person' });
    });

    it('should search entities by name', async () => {
      const response = await request(app)
        .get('/api/v2/memory/search')
        .query({ q: 'JavaScript' })
        .expect(200);

      expect(response.body).toMatchObject({
        query: 'JavaScript',
        results: expect.arrayContaining([
          expect.objectContaining({ name: 'JavaScript Project' })
        ]),
        count: 1
      });
    });

    it('should require minimum query length', async () => {
      const response = await request(app)
        .get('/api/v2/memory/search')
        .query({ q: 'a' })
        .expect(400);

      expect(response.body.error).toContain('at least 2 characters');
    });

    it('should handle empty results', async () => {
      const response = await request(app)
        .get('/api/v2/memory/search')
        .query({ q: 'nonexistent' })
        .expect(200);

      expect(response.body).toMatchObject({
        query: 'nonexistent',
        results: [],
        count: 0
      });
    });
  });

  describe('GET /api/v2/memory/stats', () => {
    it('should return system statistics', async () => {
      // Create some test data
      const entityRepo = repositoryManager.entities;
      const relationRepo = repositoryManager.relations;
      
      const entity1 = entityRepo.create({ name: 'Entity1', type: 'task' });
      const entity2 = entityRepo.create({ name: 'Entity2', type: 'person' });
      
      relationRepo.create(entity1.id, entity2.id, 'relates_to');

      const response = await request(app)
        .get('/api/v2/memory/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        entities: {
          total: 2,
          byType: expect.objectContaining({
            task: 1,
            person: 1
          })
        },
        relations: {
          total: 1
        },
        observations: {
          total: expect.any(Number)
        }
      });
    });
  });

  describe('POST /api/v2/memory/relations', () => {
    it('should create a new relation', async () => {
      const entityRepo = repositoryManager.entities;
      const entity1 = entityRepo.create({ name: 'Entity1', type: 'task' });
      const entity2 = entityRepo.create({ name: 'Entity2', type: 'person' });

      const relationData = {
        sourceId: entity1.id,
        targetId: entity2.id,
        type: 'relates_to',
        metadata: { role: 'lead' }
      };

      const response = await request(app)
        .post('/api/v2/memory/relations')
        .send(relationData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        sourceId: entity1.id,
        targetId: entity2.id,
        type: 'relates_to',
        metadata: { role: 'lead' }
      });
    });

    it('should reject relations with non-existent entities', async () => {
      const relationData = {
        sourceId: 'nonexistent-id-1',
        targetId: 'nonexistent-id-2',
        type: 'relates_to'
      };

      const response = await request(app)
        .post('/api/v2/memory/relations')
        .send(relationData)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });
});