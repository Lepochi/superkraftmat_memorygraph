# 🤖 AI Handoff Prompt - Complete Context Transfer

## 🎯 **USE THIS PROMPT FOR SEAMLESS CONTEXT TRANSFER**

Copy and paste this entire section when starting a new Claude session:

---

**CONTEXT SETUP PROMPT:**

I'm continuing work on the Superkraftmat Memory System v2.0 project. This is a high-performance knowledge graph memory system with SQLite backend, real-time WebSocket collaboration, and Canvas UI visualization.

**ESSENTIAL SETUP ACTIONS - Execute these immediately:**

1. **Read primary context file**: 
   ```
   Read /Users/lepochi/superkraft_memory/CLAUDE.md
   ```

2. **Read project roadmap**:
   ```
   Read /Users/lepochi/superkraft_memory/ROADMAP.md  
   ```

3. **Read documentation guide**:
   ```
   Read /Users/lepochi/superkraft_memory/DOCUMENTATION_GUIDE.md
   ```

4. **Check current system status**:
   ```
   Bash curl http://localhost:8000/health
   Bash curl http://localhost:8000/api/v2/memory/entities | jq '.entities | length'
   ```

**CURRENT PROJECT STATUS (June 1, 2025):**
- ✅ **Phase 4 COMPLETE**: All features working (34 entities, real-time WebSocket, Canvas UI)
- ✅ **Critical Issue RESOLVED**: Frontend connection fixed with Vite proxy configuration
- 🎯 **Current Priority**: Phase 5.1 Repository cleanup and optimization
- 📊 **System**: Fully functional with automated testing validation

**KEY FACTS:**
- Database: SQLite with 34 entities, 418 observations, 27 relations
- Backend: Express.js on port 8000 (requires USE_SQLITE=true)
- Frontend: Vite dev server on port 5173 with proxy configuration
- Features: Real-time collaboration, Canvas UI, CRUD operations, API v1/v2 switching
- Architecture: Express.js + SQLite + Vanilla JS + TypeScript MCP server

**IMMEDIATE NEXT TASKS:**
- Repository cleanup: Remove bloat, old files, duplicate documentation
- Documentation consolidation: Eliminate duplicate content across .md files
- File structure optimization: Organize for better maintainability
- Prepare for Phase 5 intelligence features

**If servers aren't running, start with:**
```bash
cd /Users/lepochi/superkraft_memory/backend && USE_SQLITE=true npm run dev &
cd /Users/lepochi/superkraft_memory/frontend && npm run dev &
```

**Verification that system is working:**
- Frontend at http://localhost:5173 should show 34 entities in Canvas UI
- Real-time collaboration works across multiple browser tabs
- All CRUD operations functional

Please confirm you've read the context files and understand the current project status before proceeding.

---

## 📋 **Detailed Technical Context**

### **Project Architecture**
- **Name**: Superkraftmat Memory System v2.0
- **Purpose**: High-performance knowledge graph for Claude Desktop with real-time collaboration
- **Status**: Phase 4 complete, all features functional, ready for cleanup and optimization

### **Technology Stack**
- **Backend**: Node.js + Express.js + SQLite + Socket.io
- **Frontend**: Vite + Vanilla JavaScript + Canvas API + Socket.io-client  
- **Database**: SQLite with WAL mode, 64MB cache, optimized for <10ms queries
- **MCP Server**: TypeScript + @modelcontextprotocol/sdk
- **Testing**: Jest (backend) + Puppeteer (frontend automation)

### **Critical File Structure**
```
/Users/lepochi/superkraft_memory/
├── CLAUDE.md                    # PRIMARY CONTEXT (read first)
├── ROADMAP.md                   # Project roadmap and phases
├── SESSION_HANDOFF.md           # Session transfer instructions
├── DOCUMENTATION_GUIDE.md       # File purpose clarification
├── backend/
│   ├── src/server.js           # Main server with WebSocket
│   ├── src/routes/v2/memory.js # v2 API endpoints
│   └── src/repositories/       # Data access layer
├── frontend/
│   ├── src/app.js              # Main UI logic
│   ├── src/api/memoryApiV2.js  # API client with WebSocket
│   └── vite.config.js          # Proxy configuration (CRITICAL)
├── memory/database/
│   └── superkraft.db           # SQLite database
└── mcp-server/                 # Claude Desktop integration
```

### **Critical Configuration**
- **Environment**: `USE_SQLITE=true` required for backend
- **Ports**: Backend (8000), Frontend (5173)
- **Database**: 34 entities, 418 observations, 27 relations
- **WebSocket**: Socket.io v4.8.1 for real-time collaboration
- **Proxy**: Vite proxies `/api` and `/health` to backend (solves CORS)

### **Recent Major Achievements**
1. **Frontend Connection Issue Resolved**: Implemented Vite proxy configuration
2. **Real-time Collaboration**: WebSocket multi-tab synchronization working
3. **Complete Testing**: Automated Puppeteer test suite validates all features
4. **Performance Optimized**: <10ms queries, smooth Canvas with 34+ entities
5. **Documentation Updated**: All status reflects current working state

### **Known Working Features**
- ✅ Entity CRUD operations (create, read, update, delete)
- ✅ Real-time multi-tab synchronization 
- ✅ Canvas UI with drag-and-drop
- ✅ API version switching (v1/v2)
- ✅ WebSocket connection indicators
- ✅ Optimistic UI updates with rollback
- ✅ Search and filtering
- ✅ Performance metrics and monitoring

### **Immediate Priorities for Next Session**

#### **Phase 5.1: Repository Cleanup (HIGH PRIORITY)**
1. **File Analysis**: Identify and catalog all files for cleanup assessment
2. **Remove Debug Files**: Delete test-*.html files and temporary debugging scripts
3. **Documentation Cleanup**: Consolidate duplicate content across .md files
4. **Structure Optimization**: Organize directories for better maintainability
5. **Dependency Audit**: Remove unused packages and optimize bundle sizes

#### **Repository Bloat Identified**
- Multiple test-*.html files (debug-console.html, test-simple-fetch.html, etc.)
- Duplicate information across CLAUDE.md, ROADMAP.md, SESSION_HANDOFF.md
- Old debugging scripts and temporary files
- Inconsistent naming conventions

### **Success Criteria for Handoff**
- [ ] All context files read and understood
- [ ] Current system status verified (34 entities loading)
- [ ] Servers running and functional
- [ ] Next phase priorities clear
- [ ] Ready to begin repository cleanup

### **Emergency Recovery**
If system appears broken:
1. Check environment: `USE_SQLITE=true`
2. Restart servers with proper commands
3. Verify database file exists at `/memory/database/superkraft.db`
4. Test direct API endpoints with curl
5. Check Vite proxy configuration in `/frontend/vite.config.js`

---

## 🚨 **CRITICAL SUCCESS FACTORS**

1. **Read CLAUDE.md first** - Contains complete project context
2. **Verify system is working** - 34 entities should display in frontend
3. **Understand current priority** - Repository cleanup, not new features
4. **Follow established patterns** - Use existing tools and conventions
5. **Maintain working state** - Don't break current functionality

**This system is production-ready and fully functional. Focus on cleanup and optimization for sustainable development.**