# Superkraftmat Memory System Context v2.0

## 🎯 Business Purpose

### Problem We're Solving
The Superkraftmat Memory System addresses the critical challenge of context loss in AI-assisted development. Every new chat session with Claude requires re-explaining project context, leading to:
- Wasted time on repetitive explanations
- Inconsistent responses due to missing context
- Friction in the development workflow
- Performance limitations with growing data

### Solution Evolution
**v1.0**: Basic persistent knowledge graph with file storage
**v2.0**: High-performance system with intelligent memory management
- SQLite database for 100x faster queries
- Custom MCP server for native Claude integration
- Smart memory with importance scoring and decay
- Canvas UI for intuitive knowledge management

### Key Users
1. **Primary**: Superkraftmat (Leonard) - Solo developer/founder
2. **Future**: Development team members
3. **AI Systems**: Claude (primary), GPT-4, other LLMs
4. **Enterprise**: Partner companies and suppliers

## 📊 Business Requirements v2.0

### Core Capabilities
1. **Performance**: Handle 10,000+ entities without lag
2. **Intelligence**: Smart context loading based on relevance
3. **Integration**: Native Claude Desktop experience
4. **Scalability**: Multi-user support with conflict resolution

### Success Metrics
- 90% reduction in context explanation time
- < 10ms query response time
- Zero data conflicts between interfaces
- 100% context accuracy

## 🏗️ Technical Architecture v2.0

### Three-Layer Architecture
```
┌─────────────────────────────────────────────────────────┐
│                 Presentation Layer                       │
│  Canvas UI (5173) | Claude Desktop | Future Mobile App  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│  MCP Server (3000) | REST API (8000) | GraphQL (Future) │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                           │
│              SQLite Database (memory.db)                 │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack v2.0
- **Database**: SQLite with better-sqlite3
- **MCP Server**: TypeScript + @modelcontextprotocol/sdk
- **Backend**: Node.js + Express + TypeORM
- **Frontend**: Vanilla JS + Canvas Components
- **Testing**: Jest + 90%+ coverage target

### Performance Architecture
- **Indexes**: Optimized for common queries
- **Caching**: In-memory hot data
- **Connection Pooling**: Efficient resource usage
- **Async Operations**: Non-blocking throughout

## 🧠 Enhanced Domain Model

### Core Tables
```sql
-- Entity storage with metadata
entities (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  metadata JSON,
  importance REAL DEFAULT 50.0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  accessed_at TIMESTAMP,
  access_count INTEGER DEFAULT 0
)

-- Relationships with strength
relations (
  id INTEGER PRIMARY KEY,
  from_id INTEGER REFERENCES entities(id),
  to_id INTEGER REFERENCES entities(id),
  type TEXT NOT NULL,
  strength REAL DEFAULT 1.0,
  metadata JSON,
  created_at TIMESTAMP
)

-- Observations with importance
observations (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER REFERENCES entities(id),
  content TEXT NOT NULL,
  importance REAL DEFAULT 50.0,
  timestamp TIMESTAMP,
  source TEXT
)
```

### Intelligence Features
1. **Importance Scoring**: 0-100 based on:
   - Access frequency
   - Recency of access
   - Manual importance flags
   - Relationship connections

2. **Temporal Decay**: 
   - Recent memories weighted higher
   - Configurable decay rates
   - Override for permanent memories

3. **Smart Loading**:
   - Predictive based on patterns
   - Context-aware filtering
   - Token optimization

## 🔄 Integration Architecture

### Claude Desktop (Custom MCP)
```typescript
// Custom MCP server provides:
- getMemories(context: string): Memory[]
- updateMemory(entity: Entity): void
- searchMemories(query: string): Memory[]
- getRelatedMemories(entity: string, depth: number): Memory[]
```

### Web UI Integration
- Real-time sync via WebSocket
- Optimistic updates
- Conflict resolution
- Offline capability

## 📈 Migration Path

### Phase 1 → Phase 2 (Current)
1. Export JSONL to migration format
2. Create SQLite schema
3. Import with data validation
4. Verify data integrity

### Backwards Compatibility
- One-time migration only
- No dual-system maintenance
- Clean cutover approach

## 🚀 Future Roadmap

### Near Term (3-6 months)
- SQLite implementation
- Custom MCP server
- Performance optimization
- Team features

### Medium Term (6-12 months)
- Multi-LLM support
- Advanced analytics
- Plugin system
- Mobile app

### Long Term (12+ months)
- Enterprise features
- SaaS offering
- API marketplace
- AI training integration

## 🔐 Security Considerations

### Data Protection
- Encryption at rest
- Secure API endpoints
- Role-based access
- Audit logging

### Privacy
- Local-first storage
- No cloud dependency
- User-controlled sharing
- GDPR compliance ready

---

*Last Updated: May 29, 2025*  
*Version: 2.0 (In Development)*  
*Primary Contact: leonard@superkraftmat.no*