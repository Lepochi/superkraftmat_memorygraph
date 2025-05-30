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

// Import memory services
const { getInstance: getMemoryService } = require('./services/memoryService');
const { getInstance: getMemoryServiceV2 } = require('./services/memoryServiceV2');

const app = express();
const PORT = process.env.PORT || 8000;

// Determine which storage mode to use
const USE_SQLITE = process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1';
const MEMORY_PATH = process.env.MEMORY_FILE_PATH || path.join(__dirname, '../../memory/data/memory.jsonl');
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../../memory/database/superkraft.db');

// Initialize memory service based on mode
console.log(`Starting server with ${USE_SQLITE ? 'SQLite' : 'JSONL'} storage mode`);
const memoryService = USE_SQLITE 
  ? getMemoryServiceV2(SQLITE_PATH)
  : getMemoryService(MEMORY_PATH);

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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Framework routes
app.use('/api/framework', frameworkRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: USE_SQLITE ? 'sqlite' : 'jsonl',
    path: USE_SQLITE ? SQLITE_PATH : MEMORY_PATH
  });
});

// API Routes

// Get all memory data
app.get('/api/memory', asyncHandler(async (req, res) => {
  const memory = await memoryService.readMemory();
  res.json(memory);
}));

// Create entities
app.post('/api/memory/entities', 
  validate('createEntities'),
  asyncHandler(async (req, res) => {
    const created = await memoryService.createEntities(req.body.entities);
    res.status(201).json({ created });
  })
);

// Delete entity
app.delete('/api/memory/entities/:name', asyncHandler(async (req, res) => {
  const result = await memoryService.deleteEntity(req.params.name);
  res.json(result);
}));

// Update entity observations
app.patch('/api/memory/entities/:name/observations', 
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
app.post('/api/memory/relations', 
  validate('createRelations'),
  asyncHandler(async (req, res) => {
    const created = await memoryService.createRelations(req.body.relations);
    res.status(201).json({ created });
  })
);

// Search entities
app.get('/api/memory/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  
  const results = await memoryService.searchEntities(q);
  res.json({ results });
}));

// Storage mode info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    storage_mode: USE_SQLITE ? 'sqlite' : 'jsonl',
    features: {
      entities: true,
      relations: true,
      observations: true,
      search: true,
      framework: true
    },
    performance: {
      expected_query_time: USE_SQLITE ? '<10ms' : '100-500ms',
      max_entities: USE_SQLITE ? '100,000+' : '1,000'
    }
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    if (USE_SQLITE && memoryService.close) {
      memoryService.close();
      console.log('Database connection closed');
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Memory API server running on port ${PORT}`);
  console.log(`Storage: ${USE_SQLITE ? 'SQLite database' : 'JSONL file'}`);
  console.log(`Path: ${USE_SQLITE ? SQLITE_PATH : MEMORY_PATH}`);
});