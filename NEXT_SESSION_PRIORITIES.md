# 🚀 Next Session Priorities - Railway Database Migration

## 🔥 **CRITICAL TASKS (Must Complete First)**

### 1. **Add Railway Persistent Volume** ⏱️ 5 minutes
```bash
# Railway Dashboard Actions:
# 1. Go to Backend Service → Settings → Volumes
# 2. Click "New Volume"
# 3. Mount Path: /app/memory
# 4. Size: 1GB
# 5. Create Volume
```

### 2. **Debug Internal Server Error** ⏱️ 15-30 minutes
```bash
# Check Railway backend deploy logs for entity creation errors
# Test minimal POST request to /api/v2/memory/entities
# Verify SQLite database write permissions
# Compare local vs production error responses
```

### 3. **Database Migration** ⏱️ 30-45 minutes
**Options to evaluate:**
- **Option A**: Direct SQLite file upload to Railway volume
- **Option B**: API-based data export/import
- **Option C**: SQL dump and restore via Railway CLI

## 🎯 **HIGH PRIORITY TASKS**

### 4. **Verify Production CRUD Operations** ⏱️ 15 minutes
```bash
# Test all operations after database migration:
# - GET /api/v2/memory/entities (should show 34 entities)
# - POST /api/v2/memory/entities (should work without error)
# - PUT /api/v2/memory/entities/:id (update functionality)
# - DELETE /api/v2/memory/entities/:id (delete functionality)
```

### 5. **Production Validation** ⏱️ 20 minutes
```bash
# End-to-end testing:
# - Canvas UI shows all migrated entities
# - Real-time WebSocket synchronization works
# - Create/edit/delete operations function properly
# - Data persists across container restarts
```

## 📦 **MEDIUM PRIORITY TASKS**

### 6. **Hybrid MCP Server Implementation** ⏱️ 60-90 minutes
```typescript
// Create hybrid MCP server that switches between:
// - Local SQLite (development)
// - Railway API (production)
// Based on environment variables or configuration
```

### 7. **Performance Optimization** ⏱️ 30 minutes
```bash
# Monitor and optimize:
# - Query response times on Railway
# - WebSocket connection stability
# - Frontend loading performance
# - Database query efficiency
```

## 🔧 **DEBUGGING TOOLS AND COMMANDS**

### **Railway Health Checks**
```bash
# Backend API Status
curl https://superkraftmatmemorygraph-production.up.railway.app/health

# Current Entity Count (should be 0, target: 34)
curl https://superkraftmatmemorygraph-production.up.railway.app/api/v2/memory/entities | jq '.pagination.total'

# Frontend Access
open https://superkraftmatmemorygraph-production-493c.up.railway.app
```

### **Local Development Reference**
```bash
# Start local for comparison/debugging
cd /Users/lepochi/superkraft_memory/backend && USE_SQLITE=true npm run dev
cd /Users/lepochi/superkraft_memory/frontend && npm run dev

# Local entity count (should be 34)
curl http://localhost:8000/api/v2/memory/entities | jq '.pagination.total'

# Local database inspection
sqlite3 /Users/lepochi/superkraft_memory/memory/database/superkraft.db "SELECT COUNT(*) FROM entities;"
```

### **Railway Deploy Logs**
```bash
# Access via Railway dashboard:
# Backend Service → Deployments → Latest → Deploy Logs
# Look for SQLite errors, permission issues, or entity creation failures
```

## 📋 **SUCCESS CRITERIA**

### **Primary Success** (Session Complete)
- [ ] Railway backend shows 34 entities (matches local)
- [ ] Create entity works without internal server error
- [ ] Frontend Canvas UI displays all migrated entities
- [ ] Data persists across Railway container restarts

### **Secondary Success** (Bonus)
- [ ] Hybrid MCP server connects Claude Desktop to Railway backend
- [ ] Performance is acceptable (queries < 100ms)
- [ ] Real-time collaboration works in production
- [ ] Production system ready for user testing

## 🚨 **KNOWN ISSUES TO INVESTIGATE**

### **Database Issues**
- Empty SQLite database on Railway backend
- Possible write permission problems
- Missing persistent volume for data storage

### **API Issues**
- Internal server error on entity creation
- Potential SQLite connection or transaction issues
- Environment variable configuration problems

### **Infrastructure Issues**
- Container restarts lose data without persistent volume
- Potential resource constraints on Railway Hobby plan

## 🔗 **ESSENTIAL URLS AND CREDENTIALS**

### **Production Endpoints**
- **Backend**: https://superkraftmatmemorygraph-production.up.railway.app
- **Frontend**: https://superkraftmatmemorygraph-production-493c.up.railway.app
- **Railway Dashboard**: https://railway.app/dashboard

### **Development Endpoints**
- **Local Backend**: http://localhost:8000
- **Local Frontend**: http://localhost:5173

### **Database Locations**
- **Local SQLite**: `/Users/lepochi/superkraft_memory/memory/database/superkraft.db`
- **Railway SQLite**: `/app/memory/database/superkraft.db` (in container)

## 📚 **CONTEXT FILES TO READ FIRST**

1. **`/Users/lepochi/superkraft_memory/CLAUDE.md`** - Updated with Railway status
2. **`/Users/lepochi/superkraft_memory/SESSION_HANDOFF.md`** - Comprehensive session summary
3. **`/Users/lepochi/superkraft_memory/NEXT_SESSION_PRIORITIES.md`** - This file

## 🎯 **ESTIMATED SESSION TIME**

- **Minimum Viable**: 1 hour (persistent volume + basic migration)
- **Complete Success**: 2-3 hours (full migration + MCP server)
- **Comprehensive**: 3-4 hours (migration + optimization + testing)

---

*Created: June 2, 2025*  
*Priority: Critical - Production deployment requires database migration*  
*Context: Railway deployment complete, database migration pending*