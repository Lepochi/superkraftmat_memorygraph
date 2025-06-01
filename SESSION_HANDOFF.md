# 🔄 Session Handoff Instructions

## 📋 **Quick Context Commands for Next Claude Session**

### 1. **Essential Context Files** (Read First)
```bash
# Primary context - Read this first
Read /Users/lepochi/superkraft_memory/CLAUDE.md

# Project roadmap and current priorities  
Read /Users/lepochi/superkraft_memory/ROADMAP.md

# Documentation structure guide
Read /Users/lepochi/superkraft_memory/DOCUMENTATION_GUIDE.md
```

### 2. **Current System Status Check**
```bash
# Check if servers are running
curl http://localhost:8000/health
curl http://localhost:5173

# If not running, start them:
cd /Users/lepochi/superkraft_memory/backend && USE_SQLITE=true npm run dev &
cd /Users/lepochi/superkraft_memory/frontend && npm run dev &
```

### 3. **Verify System State**
```bash
# Check database entities
curl http://localhost:8000/api/v2/memory/entities | jq '.entities | length'

# Should return: 34 entities

# Test frontend connection
open http://localhost:5173
# Should display: All 34 entities in Canvas UI
```

## 🎯 **Current Session Status**

### ✅ **COMPLETED (June 1, 2025)**
- **Phase 4**: 100% complete - All features working
- **Frontend Connection Issue**: RESOLVED with Vite proxy configuration
- **Real-time Features**: Multi-tab WebSocket collaboration working
- **Testing**: Automated Puppeteer test suite validates functionality
- **Documentation**: Updated with current working state

### 🏗️ **READY FOR NEXT SESSION**
**Primary Goal**: Repository cleanup and optimization (Phase 5.1)

**Immediate Tasks**:
1. **Repository Analysis**: Identify bloat, old files, duplicate content
2. **Documentation Consolidation**: Remove duplicate info across .md files  
3. **File Structure Optimization**: Clean organization for maintainability
4. **Cleanup Implementation**: Remove test-*.html files and debug scripts

### 📊 **System Architecture Overview**
- **Backend**: Express.js + SQLite (port 8000)
- **Frontend**: Vite dev server (port 5173) 
- **Database**: 34 entities, 418 observations, 27 relations
- **Features**: Real-time WebSocket, Canvas UI, CRUD operations
- **Testing**: Puppeteer automation suite

## 🚨 **Critical Information**

### **Environment Requirements**
```bash
USE_SQLITE=true  # REQUIRED for backend
Node.js 18+      # Both backend and frontend
```

### **Known Working State**
- All 34 entities display correctly in frontend
- Real-time multi-tab synchronization functional
- Canvas drag-and-drop working smoothly
- API v1/v2 switching operational
- WebSocket connection status indicators working

### **File Locations**
- Main context: `/CLAUDE.md`
- Backend: `/backend/src/server.js`
- Frontend: `/frontend/src/app.js`
- Database: `/memory/database/superkraft.db`
- Proxy config: `/frontend/vite.config.js`

## 🔧 **If Issues Arise**

### **Frontend Not Loading Entities**
1. Check Vite proxy configuration in `/frontend/vite.config.js`
2. Verify backend running with `USE_SQLITE=true`
3. Test direct API: `curl http://localhost:8000/api/v2/memory/entities`

### **WebSocket Issues**
1. Check browser console for connection errors
2. Verify Socket.io client version matches server (v4.8.1)
3. Test multi-tab sync by creating entity in one tab

### **Database Issues**
1. Verify SQLite file exists: `/memory/database/superkraft.db`
2. Check environment variable: `USE_SQLITE=true`
3. Restart backend if connection issues

## 📝 **Next Session Goals**

### **Phase 5.1: Repository Cleanup** (HIGH PRIORITY)
- Remove test-*.html debugging files
- Consolidate duplicate .md content
- Organize file structure
- Clean up unused dependencies

### **Phase 5.2+: Future Features**
- Semantic search with embeddings
- Performance optimization
- Advanced Canvas features
- Intelligence layer development

---

**System Status**: ✅ **FULLY FUNCTIONAL**  
**Last Update**: June 1, 2025  
**Next Priority**: Repository cleanup and optimization