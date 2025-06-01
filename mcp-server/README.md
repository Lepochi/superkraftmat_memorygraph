# Superkraft Memory MCP Server

A high-performance Model Context Protocol (MCP) server for the Superkraftmat Memory System, providing intelligent memory retrieval and management capabilities for Claude Desktop.

## Features

- **SQLite Backend**: Direct access to the memory database with optimized queries
- **Smart Memory Retrieval**: Context-aware memory loading with importance scoring
- **Relationship Traversal**: Navigate entity connections up to specified depth
- **Search Capabilities**: Full-text search across entities and descriptions
- **Real-time Updates**: Update entity importance and metadata on the fly

## Available Tools

### 1. `getMemories`
Retrieve memories based on context and filters.

**Parameters:**
- `context`: Optional context object
  - `topic`: Current conversation topic
  - `recentEntities`: Array of recently mentioned entity IDs
  - `depth`: Relationship traversal depth (default: 2)
  - `tokenLimit`: Maximum tokens to return (default: 2000)
- `filters`: Optional filter object
  - `types`: Array of entity types to filter
  - `minImportance`: Minimum importance score (0-1)
  - `limit`: Maximum number of entities (default: 20)

### 2. `searchMemories`
Search for memories by query string.

**Parameters:**
- `query`: Search query (required)
- `options`: Search options
  - `types`: Filter by entity types
  - `limit`: Maximum results (default: 10)
  - `includeRelations`: Include entity relationships
  - `includeObservations`: Include entity observations

### 3. `getEntity`
Get detailed information about a specific entity.

**Parameters:**
- `id`: Entity ID (required)
- `includeRelations`: Include relationships (default: true)
- `includeObservations`: Include observations (default: true)
- `observationLimit`: Maximum observations to return (default: 5)

### 4. `getRelatedMemories`
Get memories related to a specific entity.

**Parameters:**
- `entityId`: Starting entity ID (required)
- `depth`: Relationship traversal depth (default: 2)
- `limit`: Maximum related entities (default: 10)

### 5. `updateMemory`
Update an entity's information or importance.

**Parameters:**
- `id`: Entity ID (required)
- `updates`: Update object
  - `name`: New name
  - `description`: New description
  - `importanceScore`: New importance (0-1)
  - `metadata`: Additional metadata

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

## Claude Desktop Configuration

Add this server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "superkraft-memory": {
      "command": "node",
      "args": ["/path/to/superkraft_memory/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

## Architecture

The MCP server connects directly to the SQLite database at `../memory/database/superkraft.db` and provides:

1. **Database Service**: Handles all SQLite operations with prepared statements
2. **Memory Types**: TypeScript interfaces for type safety
3. **Scoring Algorithm**: Calculates entity importance based on:
   - Base importance score (0-50 points)
   - Recency boost (0-20 points)
   - Relationship count (0-20 points)
   - Observation activity (0-10 points)

## Performance

- Query response time: <10ms
- Supports 100K+ entities
- Optimized with indexes and prepared statements
- WAL mode for concurrent access

## Error Handling

The server includes comprehensive error handling:
- Invalid entity IDs return appropriate errors
- Database connection failures are caught
- All errors are formatted according to MCP protocol

## Contributing

See the main project [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT License - See [LICENSE](../LICENSE) for details.