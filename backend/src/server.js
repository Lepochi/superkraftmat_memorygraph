const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Import framework routes
const frameworkRoutes = require('./routes/framework');

const app = express();
const PORT = process.env.PORT || 8000;
const MEMORY_PATH = process.env.MEMORY_FILE_PATH || path.join(__dirname, '../../memory/data/memory.jsonl');

// Helper functions for JSONL handling
function parseJSONL(jsonlText) {
  const lines = jsonlText.trim().split('\n').filter(line => line.trim());
  return lines.map(line => JSON.parse(line));
}

function convertToJSON(jsonlData) {
  const entities = [];
  const relations = [];
  
  jsonlData.forEach(item => {
    if (item.type === 'entity') {
      entities.push({
        name: item.name,
        entityType: item.entityType,
        observations: item.observations || []
      });
    } else if (item.type === 'relation') {
      relations.push({
        from: item.from,
        to: item.to,
        relationType: item.relationType
      });
    }
  });
  
  return { entities, relations };
}

function convertToJSONL(entities, relations) {
  const lines = [];
  
  entities.forEach(entity => {
    lines.push(JSON.stringify({
      type: 'entity',
      name: entity.name,
      entityType: entity.entityType,
      observations: entity.observations || []
    }));
  });
  
  relations.forEach(relation => {
    lines.push(JSON.stringify({
      type: 'relation',
      from: relation.from,
      to: relation.to,
      relationType: relation.relationType
    }));
  });
  
  return lines.join('\n');
}

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Framework routes
app.use('/api/framework', frameworkRoutes);

// Memory API endpoints
app.get('/api/memory', async (req, res) => {
  try {
    const data = await fs.readFile(MEMORY_PATH, 'utf8');
    const jsonlData = parseJSONL(data);
    const memory = convertToJSON(jsonlData);
    res.json(memory);
  } catch (error) {
    console.error('Error reading memory:', error);
    res.status(500).json({ error: 'Failed to read memory' });
  }
});

app.post('/api/memory/entities', async (req, res) => {
  try {
    const { entities } = req.body;
    const data = await fs.readFile(MEMORY_PATH, 'utf8');
    const jsonlData = parseJSONL(data);
    const memory = convertToJSON(jsonlData);
    
    // Add new entities
    entities.forEach(entity => {
      if (!memory.entities.find(e => e.name === entity.name)) {
        memory.entities.push({
          ...entity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    
    const newJSONL = convertToJSONL(memory.entities, memory.relations);
    await fs.writeFile(MEMORY_PATH, newJSONL);
    res.json({ success: true, entities });
  } catch (error) {
    console.error('Error creating entities:', error);
    res.status(500).json({ error: 'Failed to create entities' });
  }
});

app.post('/api/memory/relations', async (req, res) => {
  try {
    const { relations } = req.body;
    const data = await fs.readFile(MEMORY_PATH, 'utf8');
    const jsonlData = parseJSONL(data);
    const memory = convertToJSON(jsonlData);
    
    // Add new relations
    relations.forEach(relation => {
      memory.relations.push({
        ...relation,
        createdAt: new Date().toISOString()
      });
    });
    
    const newJSONL = convertToJSONL(memory.entities, memory.relations);
    await fs.writeFile(MEMORY_PATH, newJSONL);
    res.json({ success: true, relations });
  } catch (error) {
    console.error('Error creating relations:', error);
    res.status(500).json({ error: 'Failed to create relations' });
  }
});

app.delete('/api/memory/entities/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await fs.readFile(MEMORY_PATH, 'utf8');
    const jsonlData = parseJSONL(data);
    const memory = convertToJSON(jsonlData);
    
    // Remove entity and related relations
    memory.entities = memory.entities.filter(e => e.name !== name);
    memory.relations = memory.relations.filter(r => r.from !== name && r.to !== name);
    
    const newJSONL = convertToJSONL(memory.entities, memory.relations);
    await fs.writeFile(MEMORY_PATH, newJSONL);
    res.json({ success: true, deleted: name });
  } catch (error) {
    console.error('Error deleting entity:', error);
    res.status(500).json({ error: 'Failed to delete entity' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    memoryPath: MEMORY_PATH
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Superkraftmat Memory Backend running on http://localhost:${PORT}`);
  console.log(`📁 Memory file: ${MEMORY_PATH}`);
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});