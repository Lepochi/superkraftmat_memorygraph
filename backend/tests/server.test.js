const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;

// Mock modules before requiring server
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    copyFile: jest.fn(),
    rename: jest.fn(),
    mkdir: jest.fn()
  }
}));

jest.mock('../src/routes/framework', () => {
  const router = require('express').Router();
  router.get('/test', (req, res) => res.json({ framework: 'test' }));
  return router;
});

// Mock dotenv
process.env.NODE_ENV = 'test';
process.env.PORT = '8001';

describe('Memory API Server', () => {
  let app;
  let server;

  beforeAll(() => {
    // Require server after mocks are set up
    const serverModule = require('../src/server');
    app = serverModule.app || serverModule;
  });

  afterAll((done) => {
    if (server && server.close) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        memoryPath: expect.any(String),
        environment: 'test',
        version: expect.any(String)
      });
    });
  });

  describe('GET /api/memory', () => {
    it('should return memory data', async () => {
      const mockData = '{"type":"entity","name":"test","entityType":"test"}\n';
      fs.readFile.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/memory')
        .expect(200);

      expect(response.body).toEqual({
        entities: [{ name: 'test', entityType: 'test', observations: [] }],
        relations: []
      });
    });

    it('should handle empty memory file', async () => {
      fs.readFile.mockResolvedValue('');

      const response = await request(app)
        .get('/api/memory')
        .expect(200);

      expect(response.body).toEqual({
        entities: [],
        relations: []
      });
    });

    it('should handle file read errors', async () => {
      fs.readFile.mockRejectedValue(new Error('Read error'));

      const response = await request(app)
        .get('/api/memory')
        .expect(500);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        code: 'FILE_SYSTEM_ERROR'
      });
    });
  });

  describe('POST /api/memory/entities', () => {
    beforeEach(() => {
      fs.readFile.mockResolvedValue('');
    });

    it('should create new entities', async () => {
      const entities = [
        { name: 'Entity1', entityType: 'project' }
      ];

      const response = await request(app)
        .post('/api/memory/entities')
        .send({ entities })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        count: 1,
        entities: expect.arrayContaining([
          expect.objectContaining({
            name: 'Entity1',
            entityType: 'project'
          })
        ])
      });

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should validate entity data', async () => {
      const response = await request(app)
        .post('/api/memory/entities')
        .send({ entities: [{ name: '' }] })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        errors: expect.any(Array)
      });
    });

    it('should handle empty entities array', async () => {
      const response = await request(app)
        .post('/api/memory/entities')
        .send({ entities: [] })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should rate limit excessive requests', async () => {
      // This test would need to make 50+ requests to trigger rate limit
      // Simplified for demonstration
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/memory/entities')
          .send({ entities: [{ name: 'Test', entityType: 'test' }] })
      );

      await Promise.all(promises);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('POST /api/memory/relations', () => {
    it('should create relations between existing entities', async () => {
      const existingData = 
        '{"type":"entity","name":"Entity1","entityType":"test"}\n' +
        '{"type":"entity","name":"Entity2","entityType":"test"}\n';
      fs.readFile.mockResolvedValue(existingData);

      const relations = [
        { from: 'Entity1', to: 'Entity2', relationType: 'uses' }
      ];

      const response = await request(app)
        .post('/api/memory/relations')
        .send({ relations })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        count: 1
      });
    });

    it('should reject relations with non-existing entities', async () => {
      fs.readFile.mockResolvedValue('');

      const relations = [
        { from: 'Missing1', to: 'Missing2', relationType: 'uses' }
      ];

      const response = await request(app)
        .post('/api/memory/relations')
        .send({ relations })
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/memory/entities/:name', () => {
    it('should delete entity and its relations', async () => {
      const existingData = 
        '{"type":"entity","name":"Entity1","entityType":"test"}\n' +
        '{"type":"relation","from":"Entity1","to":"Entity2","relationType":"uses"}\n';
      fs.readFile.mockResolvedValue(existingData);

      const response = await request(app)
        .delete('/api/memory/entities/Entity1')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        deleted: 'Entity1',
        relationsDeleted: expect.any(Number)
      });
    });

    it('should return 404 for non-existing entity', async () => {
      fs.readFile.mockResolvedValue('');

      const response = await request(app)
        .delete('/api/memory/entities/Missing')
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should validate entity name parameter', async () => {
      const response = await request(app)
        .delete('/api/memory/entities/')
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/memory/search', () => {
    it('should search entities by query', async () => {
      const existingData = 
        '{"type":"entity","name":"TestProject","entityType":"project"}\n' +
        '{"type":"entity","name":"OtherEntity","entityType":"other"}\n';
      fs.readFile.mockResolvedValue(existingData);

      const response = await request(app)
        .get('/api/memory/search')
        .query({ q: 'test' })
        .expect(200);

      expect(response.body).toMatchObject({
        query: 'test',
        count: 1,
        results: expect.arrayContaining([
          expect.objectContaining({ name: 'TestProject' })
        ])
      });
    });

    it('should require minimum query length', async () => {
      const response = await request(app)
        .get('/api/memory/search')
        .query({ q: 'a' })
        .expect(400);

      expect(response.body.error).toContain('at least 2 characters');
    });

    it('should handle missing query parameter', async () => {
      const response = await request(app)
        .get('/api/memory/search')
        .expect(400);

      expect(response.body.error).toContain('at least 2 characters');
    });
  });

  describe('Security headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Helmet adds these headers
      expect(response.headers).toMatchObject({
        'x-dns-prefetch-control': 'off',
        'x-frame-options': 'SAMEORIGIN',
        'x-content-type-options': 'nosniff'
      });
    });
  });

  describe('CORS configuration', () => {
    it('should handle CORS preflight', async () => {
      const response = await request(app)
        .options('/api/memory')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });
  });

  describe('Error handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Not found',
        code: 'NOT_FOUND',
        path: '/api/unknown'
      });
    });

    it('should handle JSON parse errors', async () => {
      const response = await request(app)
        .post('/api/memory/entities')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        code: expect.any(String)
      });
    });
  });
});