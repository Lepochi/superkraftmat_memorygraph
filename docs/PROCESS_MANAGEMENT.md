# Process Management Guide

## Overview

The Superkraftmat Memory System includes robust process management to prevent zombie processes and ensure clean startup/shutdown.

## Quick Start

### Starting the System

```bash
# Start everything (recommended)
npm run dev

# Or use the interactive menu
node start-system.js

# Start specific services
npm run dev:backend   # Backend only
npm run dev:frontend  # Frontend only
```

### Managing Processes

```bash
# Clean up zombie processes
npm run clean

# Check process status
npm run status

# Stop all services
npm run stop
```

## Process Manager Features

### 1. **Automatic Cleanup**
- Kills processes on ports 8000 (backend) and 5173 (frontend)
- Removes stale PID files
- Cleans up zombie Node processes

### 2. **PID Tracking**
- Saves process IDs to `.pids/` directory
- Tracks backend and frontend processes separately
- Automatic cleanup on process exit

### 3. **Port Management**
- Ensures ports are free before starting
- Platform-specific port killing (macOS, Linux, Windows)
- Timeout handling for stubborn processes

### 4. **Graceful Shutdown**
- Handles SIGINT (Ctrl+C) properly
- Cleans up child processes
- Removes PID files on exit

## Common Issues and Solutions

### Issue: "Port already in use"

**Solution:**
```bash
npm run clean
# Then try starting again
npm run dev
```

### Issue: Multiple Node processes running

**Solution:**
```bash
# See what's running
npm run status

# Clean everything
npm run clean
```

### Issue: Frontend won't start

**Solution:**
```bash
# Kill frontend port specifically
node scripts/process-manager.js stop-frontend

# Start frontend only
npm run dev:frontend
```

## Architecture

### Process Manager (`scripts/process-manager.js`)

**Core Functions:**
- `cleanupZombies()` - Kill all zombie processes
- `killPort(port)` - Free up a specific port
- `startProcess(name, command, cwd)` - Start a managed process
- `listProcesses()` - Show current process status

### Start System (`start-system.js`)

**Features:**
- Interactive menu system
- Colored console output
- Service health checks
- Coordinated startup sequence

## Advanced Usage

### Command Line Arguments

```bash
# Direct commands
node start-system.js all      # Start all services
node start-system.js backend  # Start backend only
node start-system.js frontend # Start frontend only
node start-system.js cleanup  # Clean zombies
node start-system.js status   # Show status
```

### Process Manager Direct Usage

```bash
# Process manager commands
node scripts/process-manager.js cleanup
node scripts/process-manager.js list
node scripts/process-manager.js start-backend
node scripts/process-manager.js start-frontend
node scripts/process-manager.js stop-backend
node scripts/process-manager.js stop-frontend
node scripts/process-manager.js stop-all
```

## Development Workflow

### Recommended Development Flow

1. **Start your day:**
   ```bash
   npm run clean    # Clean any zombies
   npm run dev      # Start everything
   ```

2. **During development:**
   - The system handles process crashes
   - Use `npm run status` to check health
   - Processes auto-restart with nodemon

3. **End of day:**
   ```bash
   # Ctrl+C in the terminal running npm run dev
   # Or explicitly:
   npm run stop
   npm run clean
   ```

## Troubleshooting

### Debug Process Issues

```bash
# Check what's using our ports
lsof -i :8000    # Backend port
lsof -i :5173    # Frontend port

# See all Node processes
ps aux | grep node

# Nuclear option - kill all Node
pkill -f node
```

### Reset Everything

```bash
# Complete reset
npm run clean
rm -rf .pids/
npm run dev
```

## Best Practices

1. **Always use npm scripts** instead of direct commands
2. **Run cleanup** if you see unexpected behavior
3. **Check status** when debugging issues
4. **Use the unified starter** (`npm run dev`) for consistency
5. **Let the process manager handle PIDs** - don't kill manually

## Platform Support

- ✅ macOS (fully tested)
- ✅ Linux (fully supported)
- ⚠️  Windows (basic support, may need adjustments)

---

For more details, see the source code:
- `/scripts/process-manager.js` - Core process management
- `/start-system.js` - Unified startup script