#!/bin/bash

echo "🚀 Starting Superkraft Memory System..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set trap for cleanup on Ctrl+C
trap cleanup INT

# Start Backend API
echo -e "${BLUE}Starting Backend API on port 8000...${NC}"
cd backend && npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Build MCP Server if needed
echo -e "${BLUE}Building MCP Server...${NC}"
cd ../mcp-server && npm run build

# Note: MCP server doesn't need to run standalone - Claude Desktop will start it
echo -e "${GREEN}✓ MCP Server built and ready${NC}"

# Start Canvas UI (Frontend)
echo -e "${BLUE}Starting Canvas UI on port 5173...${NC}"
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Wait for services to be ready
sleep 3

echo -e "\n${GREEN}✅ All services started successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Services running:${NC}"
echo -e "  • Backend API: http://localhost:8000"
echo -e "  • Canvas UI: http://localhost:5173"
echo -e "  • MCP Server: Ready for Claude Desktop"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Keep script running
wait