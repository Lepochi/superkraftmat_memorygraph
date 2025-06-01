# AI Session Handoff Prompt

Copy and paste this prompt at the start of your next AI session to maintain full context:

---

## Initial Context Loading Instructions

I'm working on the Superkraftmat Memory System v2.0. Please start by:

1. **Read these critical context files in order:**
   - `/CLAUDE.md` - Project overview and task tracking
   - `/ROADMAP.md` - Complete project roadmap and phases
   - `/SESSION_HANDOFF.md` - Latest session summary and current state
   - `/docs/context/CURRENT_STATE.md` - System architecture details
   - `/docs/context/CODING_STANDARDS.md` - Code style guidelines

2. **Use your MCP tools to analyze the memory database:**
   ```
   Use the searchMemories tool to find entities related to:
   - "Phase 4"
   - "API Integration"
   - "Frontend Integration"
   - "Optimistic"
   ```

3. **Check current implementation status:**
   - Review `/backend/src/routes/v2/memory.js` for v2 API implementation
   - Review `/frontend/src/api/memoryApiV2.js` for frontend integration
   - Check git status to see uncommitted changes

## Current Project State Summary

**Completed Phases:**
- ✅ Phase 1: Foundation & Canvas UI (100%)
- ✅ Phase 2: SQLite Database Migration (100%)
- ✅ Phase 3: MCP Server Development (100%)
- 🚧 Phase 4: API & Integration Layer (85%)
  - ✅ 4.1: REST API v2 implementation
  - ✅ 4.2: Frontend integration with optimistic updates
  - 🚧 4.3: Testing & validation (75% complete)
  - ⏳ WebSocket support
  - ⏳ Conflict resolution UI

**Latest Achievements (May 30, 2025):**
- **Phase 4.3**: Built comprehensive testing infrastructure for v2 API
- **Testing Suite**: Created 18 Jest test cases with 11/18 passing
- **Performance Validated**: <10ms query performance for all tested endpoints
- **Repository Integration**: Fixed metadata parsing and method signatures
- **Dual-Mode Support**: Tests work with both JSONL and SQLite backends

**Database Stats:**
- 40+ entities (including Phase 4.3 testing entities)
- 35+ relations
- 470+ observations
- SQLite database at `/memory/database/superkraft.db`

## Next Steps to Continue

1. **Complete Phase 4.3 Testing (Priority: High)**
   - Fix remaining 7/18 v2 API test edge cases
   - Add v1/v2 integration compatibility tests
   - Performance benchmarks with 10K+ entities
   - Load testing for concurrent operations
   - Repository method unit tests

2. **WebSocket Implementation (Priority: Medium)**
   - Install Socket.io dependencies
   - Create WebSocket server in backend
   - Implement real-time event broadcasting
   - Update frontend to listen for changes
   - Test multi-client synchronization

3. **Phase 5 Preparation (Priority: Low)**
   - Intelligence layer planning
   - Performance optimization roadmap
   - Conflict resolution UI for concurrent edits

## Important Instructions for AI

### 1. **Always Update Documentation**
After completing ANY task:
- Update the checkbox [x] in CLAUDE.md
- Add implementation details under the task
- Update progress percentages
- Update SESSION_HANDOFF.md with your changes

### 2. **Use Tools Frequently**
- Use `mcp__mcp-omnisearch__*` tools for research
- Use `mcp__mcp-sequentialthinking-tools__sequentialthinking_tools` for planning
- Use TodoWrite to track your tasks
- Search the codebase before making changes

### 3. **Update Memory Database**
When completing significant features:
- Create entities for new concepts/features
- Add observations about implementation details
- Create relations to existing entities
- Use the pattern in `/scripts/update-memory-phase4.cjs`

### 4. **Maintain Code Quality**
- Follow existing patterns in the codebase
- Keep v1 API compatibility
- Add comments for complex logic
- Test changes before marking complete

### 5. **Git Workflow**
- Current branch: `ui-enhancement-backup`
- Do NOT commit unless explicitly asked
- Keep track of modified files
- Update .gitignore if adding new patterns

## Quick Commands Reference

```bash
# Start development environment
cd /Users/lepochi/superkraft_memory
./start-all.sh

# Run backend only
cd backend && USE_SQLITE=true npm run dev

# Run frontend only  
cd frontend && npm run dev

# Test v2 API
cd backend && node tests/test-v2-api.js

# Check database
sqlite3 memory/database/superkraft.db ".tables"

# View logs
tail -f /tmp/server.log

# MCP server commands
cd mcp-server
npm run build  # Build TypeScript
npm run dev    # Run in development mode
```

## File Structure Overview
```
/Users/lepochi/superkraft_memory/
├── backend/src/
│   ├── routes/v2/memory.js    # v2 API implementation
│   ├── repositories/          # Data access layer
│   └── database/             # SQLite schema and manager
├── frontend/src/
│   ├── api/memoryApiV2.js    # Dual-version API client
│   ├── app.js                # Main app with optimistic updates
│   └── styles/main.css       # Including animation styles
├── mcp-server/               # Claude Desktop integration
├── memory/database/          # SQLite database file
└── docs/                     # All documentation
```

## Final Reminders

1. **Read context files FIRST** - Don't skip this step
2. **Update .md files as you work** - Not just at the end
3. **Test your changes** - Use the test files provided
4. **Ask for clarification** - If requirements are unclear
5. **Think step by step** - Use sequential thinking tool

Ready to continue building the Superkraftmat Memory System! 🚀

---

*End of handoff prompt - paste everything above into your next session*