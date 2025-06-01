const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import dependencies
const { errorHandler } = require('./utils/errors');
const configureRoutes = require('./routes');

// Import memory services conditionally
const { getInstance: getMemoryService } = require('./services/memoryService');
let getMemoryServiceV2, RepositoryManager;

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGIN || 'http://localhost:5173'
      : true,
    credentials: true,
    methods: ['GET', 'POST']
  },
  path: '/socket.io'
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`📡 WebSocket client connected: ${socket.id}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`📡 WebSocket client disconnected: ${socket.id} (${reason})`);
  });
  
  // Optional: Handle client ping for connection health
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Determine which storage mode to use
const USE_SQLITE = process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1';
const MEMORY_PATH = process.env.MEMORY_FILE_PATH || path.join(__dirname, '../../memory/data/memory.jsonl');
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../../memory/database/superkraft.db');

// Initialize memory service and repository manager based on mode
console.log(`Starting server with ${USE_SQLITE ? 'SQLite' : 'JSONL'} storage mode`);

let memoryService, repositoryManager = null;

if (USE_SQLITE) {
  // Only import SQLite dependencies when needed
  try {
    getMemoryServiceV2 = require('./services/memoryServiceV2').getInstance;
    RepositoryManager = require('./repositories/RepositoryManager');
    
    memoryService = getMemoryServiceV2(SQLITE_PATH);
    repositoryManager = new RepositoryManager(SQLITE_PATH);
    repositoryManager.initialize();
  } catch (error) {
    console.error('Failed to initialize SQLite dependencies:', error.message);
    console.log('Falling back to JSONL mode');
    memoryService = getMemoryService(MEMORY_PATH);
  }
} else {
  memoryService = getMemoryService(MEMORY_PATH);
}

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

// Configure all routes (v1 and v2)
configureRoutes(app, { memoryService, repositoryManager, io });

// Error handling
app.use(errorHandler);

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

// Export app and server for testing
module.exports = { app, server, memoryService, repositoryManager, io };

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Memory API server running on port ${PORT}`);
    console.log(`📊 Storage: ${USE_SQLITE ? 'SQLite database' : 'JSONL file'}`);
    console.log(`📁 Path: ${USE_SQLITE ? SQLITE_PATH : MEMORY_PATH}`);
    console.log(`📡 WebSocket server enabled at /socket.io`);
  });
}