const express = require('express');
const memoryV1Routes = require('./v1/memory');
const memoryV2Routes = require('./v2/memory');
const analyticsV2Routes = require('./v2/analytics');
const frameworkRoutes = require('./framework');

/**
 * Central route configuration
 * Manages API versioning and route mounting
 */
module.exports = (app, { memoryService, repositoryManager, io }) => {
  // API versioning middleware
  app.use((req, res, next) => {
    // Add API version to response headers
    res.setHeader('X-API-Version', req.path.includes('/v2/') ? '2.0' : '1.0');
    
    // Add deprecation warning for v1
    if (req.path.includes('/api/memory') && !req.path.includes('/v2/')) {
      res.setHeader('X-API-Deprecation', 'API v1 is deprecated. Please migrate to v2.');
      res.setHeader('X-API-Deprecation-Date', '2025-12-31');
    }
    
    next();
  });

  // Mount v1 routes (legacy, for backward compatibility)
  app.use('/api/memory', memoryV1Routes(memoryService));
  app.use('/api/v1/memory', memoryV1Routes(memoryService));

  // Mount v2 routes (new SQLite-based)
  if (repositoryManager) {
    app.use('/api/v2/memory', memoryV2Routes(repositoryManager, io));
    app.use('/api/v2/analytics', analyticsV2Routes);
  }

  // Framework routes (both v1 and v2)
  app.use('/api/framework', frameworkRoutes);
  app.use('/api/v1/framework', frameworkRoutes);
  app.use('/api/v2/framework', frameworkRoutes);

  // API info endpoints
  app.get('/api/info', (req, res) => {
    const useSqlite = !!repositoryManager;
    res.json({
      storage_mode: useSqlite ? 'sqlite' : 'jsonl',
      api_versions: {
        current: '2.0',
        supported: ['1.0', '2.0'],
        deprecated: ['1.0']
      },
      features: {
        entities: true,
        relations: true,
        observations: true,
        search: true,
        framework: true,
        pagination: useSqlite,
        advanced_filtering: useSqlite,
        real_time_updates: !!io // True when WebSocket is available
      },
      performance: {
        expected_query_time: useSqlite ? '<10ms' : '100-500ms',
        max_entities: useSqlite ? '100,000+' : '1,000'
      }
    });
  });

  app.get('/api/v2/info', (req, res) => {
    res.json({
      version: '2.0',
      storage: 'sqlite',
      endpoints: {
        entities: {
          list: 'GET /api/v2/memory/entities',
          get: 'GET /api/v2/memory/entities/:id',
          create: 'POST /api/v2/memory/entities',
          update: 'PUT /api/v2/memory/entities/:id',
          delete: 'DELETE /api/v2/memory/entities/:id',
          related: 'GET /api/v2/memory/entities/:id/related',
          observations: 'POST /api/v2/memory/entities/:id/observations'
        },
        relations: {
          list: 'GET /api/v2/memory/relations',
          create: 'POST /api/v2/memory/relations',
          delete: 'DELETE /api/v2/memory/relations/:id'
        },
        search: 'GET /api/v2/memory/search',
        stats: 'GET /api/v2/memory/stats',
        analytics: {
          summary: 'GET /api/v2/analytics/summary',
          realtime: 'GET /api/v2/analytics/realtime',
          performance: 'GET /api/v2/analytics/performance',
          system: 'GET /api/v2/analytics/system',
          semantic: 'GET /api/v2/analytics/semantic',
          backend: 'GET /api/v2/analytics/backend',
          memory: 'GET /api/v2/analytics/memory',
          health: 'GET /api/v2/analytics/health'
        }
      },
      features: {
        pagination: true,
        filtering: true,
        sorting: true,
        full_text_search: true,
        metadata_support: true,
        batch_operations: false, // TODO: Add in future
        websocket: !!io, // True when WebSocket is available
        analytics: true,
        performance_monitoring: true
      }
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    const useSqlite = !!repositoryManager;
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      mode: useSqlite ? 'sqlite' : 'jsonl',
      api_version: '2.0'
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ 
      error: 'Not Found',
      message: `Route ${req.method} ${req.url} not found`,
      available_versions: ['/api/v1', '/api/v2']
    });
  });
};