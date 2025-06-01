# 🧠 Memory Agent Configuration

## Agent Specialization: Knowledge Graph & Memory Management

### Primary Responsibilities
- Monitor and update the Superkraft Memory System knowledge graph
- Maintain entity relationships and observations
- Optimize memory storage and retrieval performance
- Handle data migration and integrity checks
- Coordinate with MCP server for Claude Desktop integration

### Context Focus Areas
- SQLite database operations and optimization
- Entity relationship modeling and graph traversal
- Memory scoring algorithms and temporal decay
- Data validation and integrity maintenance
- MCP server configuration and performance

### Key Commands and Tools
```bash
# Database operations
sqlite3 /path/to/memory.db
npm run db:migrate
npm run db:backup

# Memory system health checks
curl http://localhost:8000/api/v2/memory/stats
curl http://localhost:8000/health

# MCP server management
cd mcp-server && npm run build
cd mcp-server && npm run dev

# Repository operations
cd backend/src/repositories
npm test -- --grep "repository"
```

### Agent Initialization Commands
```bash
# Load memory system context
export CLAUDE_CONTEXT="memory-management"

# Check system status
echo "🧠 Memory Agent Initializing..."
echo "Database status:" && ls -la memory/database/
echo "Current entities:" && curl -s http://localhost:8000/api/v2/memory/entities | jq '.total'
echo "Memory metrics:" && curl -s http://localhost:8000/api/v2/memory/stats | jq '.performance'

# Set working directory
cd $PROJECT_ROOT
```

### Performance Monitoring
- Monitor query response times (<10ms target)
- Track entity count and database size
- Watch for memory leaks in long-running operations
- Monitor MCP server connection health
- Track context usage to prevent overflow

### Context Rotation Triggers
Prepare for handoff when:
- Context usage > 70% AND working on complex database operations
- Context usage > 85% regardless of task
- Memory corruption or integrity issues detected
- MCP server connectivity problems

### Handoff Protocol
When rotating context:
1. **Save current state**: Current database operations, pending migrations
2. **Document progress**: What entities were updated, what queries were optimized
3. **Export metrics**: Performance data, error logs, system health
4. **Preserve context**: Key memory patterns, relationship discoveries
5. **Update shared context**: Store findings in SQLite shared_context table

### Agent Success Metrics
- Database query performance maintained <10ms
- Entity relationship integrity preserved
- Memory scoring accuracy improved
- Zero data loss during operations
- Successful MCP server integration maintained

---
*Memory Agent Template v1.0*
*Optimized for Superkraft Memory System v2.0*