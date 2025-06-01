#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Superkraft Memory System Status Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check Backend API
echo -n "Backend API (port 8000): "
if curl -s http://localhost:8000/api/info > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
    echo -e "  └─ Storage: SQLite"
else
    echo -e "${RED}✗ Not running${NC}"
    echo -e "  └─ Run: cd backend && npm run dev"
fi

# Check Frontend
echo -n "Canvas UI (port 5173): "
if curl -s http://localhost:5173 | grep -q "Memory Manager"; then
    echo -e "${GREEN}✓ Running${NC}"
    echo -e "  └─ URL: http://localhost:5173"
else
    echo -e "${RED}✗ Not running${NC}"
    echo -e "  └─ Run: cd frontend && npm run dev"
fi

# Check MCP Server Build
echo -n "MCP Server: "
if [ -f "/Users/lepochi/superkraft_memory/mcp-server/dist/index.js" ]; then
    echo -e "${GREEN}✓ Built and ready${NC}"
    echo -e "  └─ Claude Desktop will start it automatically"
else
    echo -e "${RED}✗ Not built${NC}"
    echo -e "  └─ Run: cd mcp-server && npm run build"
fi

# Check SQLite Database
echo -n "SQLite Database: "
if [ -f "/Users/lepochi/superkraft_memory/memory/database/superkraft.db" ]; then
    ENTITY_COUNT=$(sqlite3 /Users/lepochi/superkraft_memory/memory/database/superkraft.db "SELECT COUNT(*) FROM entities;" 2>/dev/null || echo "?")
    echo -e "${GREEN}✓ Exists${NC}"
    echo -e "  └─ Entities: $ENTITY_COUNT"
else
    echo -e "${RED}✗ Not found${NC}"
fi

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Claude Desktop reminder
echo -e "\n${YELLOW}📌 Claude Desktop Configuration:${NC}"
echo "Make sure your claude_desktop_config.json includes:"
echo -e "${GREEN}\"superkraft-memory\": {
  \"command\": \"node\",
  \"args\": [\"/Users/lepochi/superkraft_memory/mcp-server/dist/index.js\"]
}${NC}"

echo -e "\n${YELLOW}🚀 Quick Commands:${NC}"
echo "• Start all: cd /path/to/superkraft_memory && ./start-all.sh"
echo "• Backend only: cd backend && npm run dev"
echo "• Frontend only: cd frontend && npm run dev"
echo "• Build MCP: cd mcp-server && npm run build"