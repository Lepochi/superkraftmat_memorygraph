const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import dependencies
const frameworkRoutes = require('./routes/framework');
const { validate } = require('./middleware/validation');
const asyncHandler = require('./middleware/asyncHandler');
const { errorHandler } = require('./utils/errors');
const { getInstance: getMemoryService } = require('./services/memoryService');

const app = express();
const PORT = process.env.PORT || 8000;
const MEMORY_PATH = process.env.MEMORY_FILE_PATH || path.join(__dirname, '../../memory/data/memory.jsonl');

// Initialize memory service
const memoryService = getMemoryService(MEMORY_PATH);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || 'http://localhost:5173'
    : true,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit write operations
  message: 'Too many write operations, please try again later.'
});

app.use('/api/', limiter);
app.use('/api/memory/entities', writeLimiter);
app.use('/api/memory/relations', writeLimiter);

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Framework routes
app.use('/api/framework', frameworkRoutes);

// Memory API endpoints
app.get('/api/memory', asyncHandler(async (req, res) => {
  const memory = await memoryService.readMemory();
  res.json(memory);
}));

app.post('/api/memory/entities', validate('createEntities'), asyncHandler(async (req, res) => {
  const { entities } = req.body;
  const created = await memoryService.createEntities(entities);
  res.status(201).json({ 
    success: true, 
    entities: created,
    count: created.length 
  });
}));

app.post('/api/memory/relations', validate('createRelations'), asyncHandler(async (req, res) => {
  const { relations } = req.body;
  const created = await memoryService.createRelations(relations);
  res.status(201).json({ 
    success: true, 
    relations: created,
    count: created.length 
  });
}));

app.put('/api/memory/entities/:name/observations', validate('entityName'), asyncHandler(async (req, res) => {
  const { name } = req.params;
  const { observations } = req.body;
  
  if (!Array.isArray(observations)) {
    return res.status(400).json({ 
      error: 'Observations must be an array' 
    });
  }
  
  const updated = await memoryService.updateEntityObservations(name, observations);
  res.json({ 
    success: true, 
    entity: updated 
  });
}));

app.delete('/api/memory/entities/:name', validate('entityName'), asyncHandler(async (req, res) => {
  const { name } = req.params;
  const result = await memoryService.deleteEntity(name);
  res.json({ 
    success: true, 
    deleted: name,
    relationsDeleted: result.deletedRelations
  });
}));

app.get('/api/memory/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ 
      error: 'Search query must be at least 2 characters' 
    });
  }
  
  const results = await memoryService.searchEntities(q);
  res.json({ 
    query: q, 
    results,
    count: results.length 
  });
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    memoryPath: MEMORY_PATH,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server only if not in test environment
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`🚀 Superkraftmat Memory Backend running on http://localhost:${PORT}`);
    console.log(`📁 Memory file: ${MEMORY_PATH}`);
    console.log(`🌐 CORS: ${process.env.NODE_ENV === 'production' ? 'Production mode' : 'Development mode'}`);
    console.log(`🔒 Security: Helmet enabled, Rate limiting active`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Export for testing
module.exports = app;