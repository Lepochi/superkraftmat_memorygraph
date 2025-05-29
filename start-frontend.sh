#!/bin/bash

# Start Frontend Development Script

echo "🚀 Starting Superkraftmat Memory Frontend..."

# Kill any existing processes on port 5173
echo "Checking for existing processes on port 5173..."
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

# Navigate to frontend directory
cd frontend

# Start Vite dev server
echo "Starting Vite development server..."
npm run dev

# Keep the script running
wait