# 🧠 Superkraftmat Memory System

A high-performance knowledge graph with Claude Desktop integration, direct Supabase connection, and real-time Canvas UI.

## 🚀 Current Architecture

```
Claude Desktop → MCP Server → Supabase PostgreSQL
                                    ↑
Canvas UI (Frontend) ───────────────┘
```

## ⚡ Quick Start

```bash
# Clone and install
git clone <your-repo-url>
cd superkraft_memory
npm install

# Start services
cd backend && npm run dev     # API server (port 8000)
cd frontend && npm run dev    # Canvas UI (port 5173)
cd mcp-server && npm run dev  # MCP server for Claude

# Production URLs
Frontend: https://superkraftmatmemorygraph-production-493c.up.railway.app
Database: Supabase PostgreSQL (35 entities, 36 relations, 480 observations)
```

## 🎯 Key Features

- **Canvas UI**: Drag-and-drop knowledge graph visualization
- **Direct Supabase**: Frontend connects directly to PostgreSQL
- **MCP Integration**: Claude Desktop memory tools
- **Real-time Sync**: WebSocket updates across all clients
- **Natural Language**: Cmd+K quick capture with pattern parsing
- **Analytics Dashboard**: Performance monitoring and insights

## 📁 Simplified Structure

```
superkraft_memory/
├── frontend/        # Canvas UI (connects to Supabase)
├── backend/         # API server (optional, for development)
├── mcp-server/      # Claude Desktop integration
├── memory/          # Local SQLite data
└── docs/            # Essential documentation
```

## 🛠️ Technology Stack

- **Database**: Supabase PostgreSQL (production)
- **Frontend**: Vanilla JS + Canvas API + Socket.io
- **MCP Server**: TypeScript + Supabase client
- **Deployment**: Railway (frontend) + Supabase (database)

## 📚 Documentation

- **Claude Context**: See [CLAUDE.md](CLAUDE.md) for complete system details
- **Roadmap**: See [ROADMAP.md](ROADMAP.md) for project phases
- **MCP Setup**: See [mcp-server/README.md](mcp-server/README.md)

## 🏢 About

Built by Superkraftmat AS - Intelligent food systems with persistent AI memory.

---

**Production Ready** - All systems operational with real-time collaboration
