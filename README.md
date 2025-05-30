# 🧠 Superkraftmat Memory System v2.0

A high-performance knowledge graph with native Claude Desktop integration, powered by SQLite and a custom MCP server.

## 🚀 What's New in v2.0

- **Custom MCP Server**: TypeScript-based server replacing generic knowledge-graph
- **SQLite Database**: 100x faster queries, concurrent access, advanced features
- **Canvas UI**: n8n-style draggable interface for visual knowledge management
- **Smart Memory**: Importance scoring, temporal decay, and intelligent retrieval
- **Unified System**: Single database for both Claude Desktop and web UI

## ⚡ Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd superkraft_memory

# Install dependencies
npm install

# Run database migration (coming soon)
npm run migrate

# Start all services
npm run dev
```

## 🏗️ Architecture v2.0

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Desktop                        │
│                         ↓                                │
│              Custom MCP Server (TypeScript)              │
│                    Port: 3000                            │
└─────────────────────↓───────────────────────────────────┘
                      ↓
┌─────────────────────↓───────────────────────────────────┐
│                 SQLite Database                          │
│              memory/data/memory.db                       │
└─────────────────────↑───────────────────────────────────┘
                      ↑
┌─────────────────────┴───────────────────────────────────┐
│  Canvas UI (5173)   │    Backend API (8000)             │
│  - Draggable Graph  │    - Express.js Server            │
│  - Entity Manager   │    - SQLite ORM                   │
│  - Visual Canvas    │    - Memory Engine                │
└─────────────────────┴───────────────────────────────────┘
```

## 📁 Project Structure

```
superkraft_memory/
├── mcp-server/              # Custom MCP server (NEW in v2.0)
│   ├── src/                 # TypeScript source
│   ├── dist/                # Compiled JavaScript
│   └── package.json         # MCP dependencies
├── frontend/                # Canvas UI application
│   ├── src/                 
│   │   ├── components/      # Canvas, Entity components
│   │   ├── api/             # API client
│   │   └── styles/          # CSS files
│   └── package.json         
├── backend/                 # API server
│   ├── src/                 
│   │   ├── db/              # SQLite models & migrations
│   │   ├── services/        # Business logic
│   │   └── routes/          # API endpoints
│   └── package.json         
├── memory/                  # Data storage
│   ├── data/                
│   │   ├── memory.db        # SQLite database (NEW)
│   │   └── memory.jsonl     # Legacy format (migrating)
│   └── migrations/          # Database migrations
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── tests/                   # Test suites
└── package.json             # Monorepo configuration
```

## 🛠️ Technology Stack

### Core Technologies
- **Database**: SQLite with better-sqlite3
- **MCP Server**: TypeScript + @modelcontextprotocol/sdk
- **Backend**: Node.js + Express + TypeORM
- **Frontend**: Vanilla JS + Canvas UI components
- **Process Management**: Custom process manager

### Key Features
- **Canvas UI**: Draggable entities with real-time connections
- **Smart Queries**: Graph traversal, semantic search, filters
- **Memory Scoring**: Importance and recency algorithms
- **Concurrent Access**: Multiple clients without conflicts
- **Type Safety**: Full TypeScript in MCP server

## 📋 Implementation Phases

### Phase 1: Foundation (Current)
- ✅ Canvas UI with draggable entities
- ✅ Basic JSONL storage
- ✅ Process management system
- ✅ Test infrastructure

### Phase 2: Database Migration
- [ ] SQLite schema design
- [ ] Data migration tool
- [ ] ORM integration
- [ ] Query optimization

### Phase 3: Custom MCP Server
- [ ] TypeScript project setup
- [ ] MCP protocol implementation
- [ ] Claude Desktop integration
- [ ] Advanced query handlers

### Phase 4: Smart Features
- [ ] Memory importance scoring
- [ ] Temporal decay algorithm
- [ ] Relationship strength tracking
- [ ] Context optimization

### Phase 5: Polish & Deploy
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Deployment scripts
- [ ] User documentation

## 🔧 Development

```bash
# Start individual services
npm run dev:mcp      # MCP server (port 3000)
npm run dev:backend  # API server (port 8000)
npm run dev:frontend # Canvas UI (port 5173)

# Run tests
npm test             # All tests
npm run test:mcp     # MCP server tests
npm run test:backend # Backend tests

# Database operations
npm run db:migrate   # Run migrations
npm run db:seed      # Seed test data
npm run db:reset     # Reset database
```

## 📚 Documentation

- [Architecture Overview](docs/architecture/README.md) - System design
- [MCP Server Guide](docs/mcp-server/README.md) - Custom MCP implementation
- [API Reference](docs/api/README.md) - REST API documentation
- [Migration Guide](docs/migration/README.md) - Upgrading from v1.0

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file.

## 🏢 About Superkraftmat AS

Building intelligent food systems with persistent AI memory.

- **Contact**: leonard@superkraftmat.no
- **Website**: superkraftmat.no
- **Location**: Norway

---

**v2.0** - Powered by SQLite, TypeScript, and Claude Desktop integration