# MCP Server Simplification - Session Prompt for Implementation

**Purpose**: This prompt provides complete context for implementing the MCP server simplification in a new session.

---

## 🚀 Session Prompt

I need you to simplify the MCP server architecture to fix Claude Desktop memory tools. The MCP server is currently broken due to better-sqlite3 compilation issues in Docker. We need to remove all the complex hybrid backend code and use Supabase directly.

### Critical Context Files to Read First:

1. **Read the simplification plan**: `/workspaces/superkraft_memory/docs/development/mcp-architecture-simplification-plan.md`
   - This contains the complete analysis and step-by-step implementation plan

2. **Read current MCP server structure**: 
   - `/workspaces/superkraft_memory/mcp-server/src/index.ts` - Main entry point showing hybrid backend usage
   - `/workspaces/superkraft_memory/mcp-server/src/services/HybridDatabaseService.ts` - Complex abstraction to remove
   - `/workspaces/superkraft_memory/mcp-server/src/services/SupabaseBackend.ts` - Existing Supabase code to adapt

3. **Check environment configuration**: 
   - `/workspaces/superkraft_memory/mcp-server/.env` - Contains Supabase credentials
   - `/workspaces/superkraft_memory/mcp-server/package.json` - Dependencies to update

4. **Understand the data structure**:
   - `/workspaces/superkraft_memory/mcp-server/src/types/memory.ts` - Entity/Relation/Observation types

### Current Situation:
- MCP server fails to start due to better-sqlite3 module compilation error
- Production has 35 entities, 36 relations, 480 observations in Supabase
- Frontend already connects directly to Supabase (no backend needed for UI)
- Local SQLite is NOT synced with Supabase and causes platform issues

### Implementation Tasks:

1. **Remove Hybrid Backend System**:
   - Delete all files in `/mcp-server/src/services/` EXCEPT keep the types from SupabaseBackend.ts
   - Remove BackendFactory, HybridDatabaseService, LocalSQLiteBackend, RailwayAPIBackend, IMemoryBackend

2. **Create Simple Supabase Service**:
   - Create new `/mcp-server/src/services/SupabaseService.ts`
   - Use @supabase/supabase-js client directly
   - Implement methods: getEntities, searchEntities, getEntity, updateEntity, getRelations, getRelatedEntities, getObservations, getEntityScore

3. **Update index.ts**:
   - Remove all hybrid backend initialization
   - Create single SupabaseService instance
   - Update all tool handlers to use the service directly
   - Keep all MCP tool definitions unchanged

4. **Update Dependencies**:
   - Run: `npm uninstall better-sqlite3`
   - Run: `npm install @supabase/supabase-js`
   - Clean up any other unused database dependencies

5. **Test the Implementation**:
   - Build: `npm run build`
   - Test: `node dist/index.js` (should start without errors)
   - Verify Supabase connection works

### Expected Outcome:
- MCP server starts without compilation errors
- All 5 memory tools (getMemories, searchMemories, getEntity, getRelatedMemories, updateMemory) work
- Same code runs in Docker, local dev, and production
- ~70% less code, much simpler architecture

### Supabase Details:
- URL: `https://xthjwtxmlmnwcwvqfiai.supabase.co`
- Tables: entities, relations, observations, memory_scores
- Use the anon key from .env file

### Important Notes:
- Keep the Railway tools in index.ts (they're separate and working)
- Maintain the same MCP tool interfaces - only change the backend implementation
- The goal is simplification - remove all unnecessary abstraction layers
- Test with a simple query to Supabase first to ensure connection works

### Quick Test After Implementation:
```bash
# In mcp-server directory
npm run build
node dist/index.js
# Should see: "🚀 Superkraft Memory MCP Server v2.0 started"
# No errors about better-sqlite3 or module compilation
```

Please start by reading the files mentioned above to understand the current architecture, then follow the implementation plan to simplify the MCP server.

---

## 📋 Additional Context for Success

### File Structure After Simplification:
```
mcp-server/
├── src/
│   ├── index.ts                    # Updated to use SupabaseService
│   ├── services/
│   │   └── SupabaseService.ts      # NEW - Single service file
│   └── types/
│       └── memory.ts               # Keep unchanged
├── package.json                    # Remove better-sqlite3, add @supabase/supabase-js
└── .env                           # Keep unchanged (has Supabase credentials)
```

### Code Pattern to Follow:
```typescript
// SupabaseService.ts structure
import { createClient } from '@supabase/supabase-js';

export class SupabaseService {
  private supabase;
  
  constructor() {
    const url = process.env.SUPABASE_URL || 'https://xthjwtxmlmnwcwvqfiai.supabase.co';
    const key = process.env.SUPABASE_ANON_KEY || '...'; // From .env
    this.supabase = createClient(url, key);
  }
  
  async getEntities(options: {...}) {
    const { data, error } = await this.supabase
      .from('entities')
      .select('*')
      // Apply filters based on options
      .order('importance_score', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  // ... other methods
}
```

### Testing Checklist:
- [ ] MCP server builds without errors
- [ ] Server starts without better-sqlite3 errors  
- [ ] Can connect to Supabase
- [ ] getMemories tool returns data
- [ ] searchMemories finds entities
- [ ] No TypeScript compilation errors
- [ ] All imports resolve correctly

This implementation will fix the immediate problem and create a much cleaner, more maintainable codebase.