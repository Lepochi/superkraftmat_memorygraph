# Claude Desktop Setup Guide

This guide explains how to configure Claude Desktop to use the Superkraft Memory MCP Server.

## Prerequisites

1. Claude Desktop installed on your system
2. Node.js v18+ installed
3. Superkraft Memory System set up with SQLite database

## Installation Steps

### 1. Build the MCP Server

```bash
cd /path/to/superkraft_memory/mcp-server
npm install
npm run build
```

### 2. Locate Claude Desktop Config

The configuration file location depends on your operating system:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 3. Add MCP Server Configuration

Open the config file and add the superkraft-memory server:

```json
{
  "mcpServers": {
    "superkraft-memory": {
      "command": "node",
      "args": [
        "/absolute/path/to/superkraft_memory/mcp-server/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

**Important**: Replace `/absolute/path/to/` with the actual path to your superkraft_memory directory.

### 4. Restart Claude Desktop

After saving the configuration, restart Claude Desktop for the changes to take effect.

## Verifying the Installation

Once configured, you can verify the MCP server is working by asking Claude:

1. "What tools do you have available?" - Should list the 5 memory tools
2. "Search memories for 'project'" - Should search your memory database
3. "Get memory details for entity X" - Should retrieve specific entity information

## Available Tools

After setup, Claude will have access to these memory tools:

1. **getMemories** - Context-aware memory retrieval
2. **searchMemories** - Search by keywords
3. **getEntity** - Get specific entity details
4. **getRelatedMemories** - Find connected entities
5. **updateMemory** - Update entity information

## Troubleshooting

### Server doesn't appear in Claude

1. Check the config file path is correct
2. Ensure the MCP server path is absolute, not relative
3. Verify Node.js is in your system PATH
4. Check Claude Desktop logs for errors

### Database connection errors

1. Ensure the SQLite database exists at `../memory/database/superkraft.db`
2. Check file permissions on the database
3. Verify the database isn't locked by another process

### Build errors

1. Ensure all dependencies are installed: `npm install`
2. Check TypeScript version: `npm list typescript`
3. Clear and rebuild: `npm run clean && npm run build`

## Development Mode

For development, you can run the server with hot reload:

```bash
cd mcp-server
npm run dev
```

Then update your Claude config to use tsx instead:

```json
{
  "mcpServers": {
    "superkraft-memory-dev": {
      "command": "npx",
      "args": [
        "tsx",
        "watch",
        "/path/to/superkraft_memory/mcp-server/src/index.ts"
      ]
    }
  }
}
```

## Security Considerations

- The MCP server has read/write access to your memory database
- Only configure trusted MCP servers in Claude Desktop
- Consider using read-only database access for shared systems

## Support

For issues or questions:
1. Check the main project README
2. Review SESSION_HANDOFF.md for implementation details
3. Contact: leonard@superkraftmat.no