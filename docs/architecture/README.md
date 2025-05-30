# 🏗️ Superkraftmat Memory System Architecture v2.0

## Overview

The Superkraftmat Memory System v2.0 is a high-performance knowledge graph designed for seamless AI integration. This document outlines the technical architecture, design decisions, and implementation details.

## System Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Claude Desktop  │  Canvas Web UI  │  Future Mobile App     │
│  (via MCP)       │  (Port 5173)    │  (React Native)        │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
├─────────────────────────────────────────────────────────────┤
│  MCP Server      │  REST API        │  GraphQL API          │
│  (Port 3000)     │  (Port 8000)     │  (Future)             │
│  TypeScript      │  Express.js      │  Apollo               │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│                 SQLite Database                              │
│              (memory/data/memory.db)                         │
│                                                              │
│  Tables: entities, relations, observations, scores          │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Entity Model

```sql
CREATE TABLE entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('person', 'company', 'project', 'system', 'other')),
    metadata JSON,
    importance REAL DEFAULT 50.0 CHECK (importance >= 0 AND importance <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0
);

CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_importance ON entities(importance DESC);
CREATE INDEX idx_entities_accessed ON entities(accessed_at DESC);
```

### Relation Model

```sql
CREATE TABLE relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    to_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    strength REAL DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_id, to_id, type)
);

CREATE INDEX idx_relations_from ON relations(from_id);
CREATE INDEX idx_relations_to ON relations(to_id);
CREATE INDEX idx_relations_type ON relations(type);
```

### Observation Model

```sql
CREATE TABLE observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    importance REAL DEFAULT 50.0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source TEXT DEFAULT 'user',
    embedding BLOB,  -- For future semantic search
    FOREIGN KEY (entity_id) REFERENCES entities(id)
);

CREATE INDEX idx_observations_entity ON observations(entity_id);
CREATE INDEX idx_observations_timestamp ON observations(timestamp DESC);
CREATE INDEX idx_observations_importance ON observations(importance DESC);
```

### Memory Scoring

```sql
CREATE TABLE memory_scores (
    entity_id INTEGER PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
    base_importance REAL DEFAULT 50.0,
    temporal_boost REAL DEFAULT 0.0,
    relationship_boost REAL DEFAULT 0.0,
    final_score REAL GENERATED ALWAYS AS (
        base_importance + temporal_boost + relationship_boost
    ) STORED,
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scores_final ON memory_scores(final_score DESC);
```

## Service Architecture

### MCP Server (TypeScript)

```typescript
interface MemoryService {
  // Core operations
  getMemories(context: ConversationContext): Memory[];
  updateMemory(entity: Entity): Promise<void>;
  
  // Advanced queries
  searchMemories(query: string, options: SearchOptions): Memory[];
  getRelatedMemories(entityName: string, depth: number): Memory[];
  
  // Intelligence features
  calculateImportance(entity: Entity): number;
  applyTemporalDecay(): Promise<void>;
  optimizeForTokens(memories: Memory[], limit: number): Memory[];
}
```

### REST API Structure

```
/api/v2/
├── /entities
│   ├── GET    /           # List with pagination
│   ├── POST   /           # Create entity
│   ├── GET    /:id        # Get entity
│   ├── PUT    /:id        # Update entity
│   ├── DELETE /:id        # Delete entity
│   └── GET    /:id/graph  # Get entity with relations
├── /relations
│   ├── GET    /           # List relations
│   ├── POST   /           # Create relation
│   └── DELETE /:id        # Delete relation
├── /search
│   ├── GET    /           # Full-text search
│   └── POST   /semantic   # Semantic search (future)
├── /memory
│   ├── GET    /context    # Get contextual memories
│   ├── POST   /score      # Recalculate scores
│   └── GET    /stats      # Memory statistics
└── /health                # Health check
```

## Key Design Decisions

### Why SQLite?

1. **Performance**: 100x faster than JSONL for queries
2. **ACID Compliance**: Guaranteed data consistency
3. **Embedded**: No separate database server needed
4. **Feature-Rich**: Full SQL support, JSON functions
5. **Portable**: Single file, easy backup/restore

### Why TypeScript for MCP?

1. **Type Safety**: MCP protocol has specific interfaces
2. **Better IDE Support**: Autocomplete and refactoring
3. **Error Prevention**: Catch issues at compile time
4. **Documentation**: Types serve as documentation
5. **Future-Proof**: Easier to maintain and extend

### Why Custom MCP Server?

1. **Control**: Implement our specific requirements
2. **Performance**: Optimize for our use cases
3. **Features**: Add intelligence layer
4. **Integration**: Tighter coupling with our data model
5. **Evolution**: Adapt as needs change

## Performance Optimizations

### Database Level

- **Indexes**: On all foreign keys and commonly queried fields
- **Generated Columns**: Pre-calculated scores
- **Connection Pooling**: Reuse database connections
- **Prepared Statements**: Compiled query plans

### Application Level

- **Caching**: In-memory cache for hot data
- **Batch Operations**: Group database writes
- **Async Processing**: Non-blocking operations
- **Lazy Loading**: Load relations on demand

### Query Optimization

```sql
-- Example: Get top memories with relations
WITH RankedEntities AS (
  SELECT e.*, ms.final_score
  FROM entities e
  JOIN memory_scores ms ON e.id = ms.entity_id
  WHERE ms.final_score > 70
  ORDER BY ms.final_score DESC
  LIMIT 20
)
SELECT 
  e.*,
  json_group_array(
    json_object('id', r.id, 'type', r.type, 'to', t.name)
  ) as relations
FROM RankedEntities e
LEFT JOIN relations r ON e.id = r.from_id
LEFT JOIN entities t ON r.to_id = t.id
GROUP BY e.id;
```

## Security Architecture

### API Security

- **Authentication**: JWT tokens (Phase 5)
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Joi schemas
- **SQL Injection**: Parameterized queries
- **XSS Prevention**: Output encoding

### Data Security

- **Encryption**: Optional at-rest encryption
- **Backups**: Automated daily backups
- **Audit Trail**: Track all modifications
- **Access Control**: Role-based (future)

## Scalability Considerations

### Vertical Scaling

- **Current**: Handles 10,000+ entities
- **Optimization**: Can reach 100,000+ with tuning
- **Limits**: Single-machine bound

### Horizontal Scaling (Future)

- **Read Replicas**: For query distribution
- **Sharding**: By entity type or user
- **Caching Layer**: Redis for hot data
- **CDN**: For static assets

## Deployment Architecture

### Development

```bash
# All services in one command
npm run dev

# Individual services
npm run dev:mcp      # MCP server
npm run dev:api      # REST API
npm run dev:ui       # Canvas UI
```

### Production (Future)

```yaml
# docker-compose.yml
services:
  mcp-server:
    image: superkraftmat/mcp-server:latest
    ports: ["3000:3000"]
    volumes: ["./data:/app/data"]
  
  api-server:
    image: superkraftmat/api-server:latest
    ports: ["8000:8000"]
    volumes: ["./data:/app/data"]
  
  web-ui:
    image: superkraftmat/web-ui:latest
    ports: ["80:80"]
```

## Monitoring & Observability

### Metrics

- Query performance (p50, p95, p99)
- Memory usage patterns
- API response times
- Error rates

### Logging

- Structured JSON logs
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation (future)

### Health Checks

- Database connectivity
- Memory usage
- API availability
- MCP server status

---

*Last Updated: May 29, 2025*  
*Architecture Version: 2.0*