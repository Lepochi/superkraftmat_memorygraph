# 🛠️ Superkraftmat Memory System - Complete Tools Reference

*All available commands, tools, and utilities in your system*

## 🎯 Claude Code Slash Commands

Located in `.claude/commands/` - Type `/` in Claude Code to access

### `/analyze [path/file]`
**Purpose**: Deep code analysis with actionable insights  
**When to use**: 
- Starting work on existing code
- Before major refactoring
- Checking code health
- Finding technical debt

**Output**: Health score, strengths, issues, complexity metrics, recommendations

### `/refactor [code/file]`
**Purpose**: Intelligent refactoring using SOLID principles  
**When to use**:
- Improving code quality
- Reducing complexity
- Applying design patterns
- Performance optimization

**Output**: Refactored code, performance metrics, breaking changes list

### `/test [feature/file]`
**Purpose**: Generate comprehensive test suites following TDD  
**When to use**:
- Writing new features
- Increasing test coverage
- Finding edge cases
- Creating test templates

**Output**: Unit tests, integration tests, edge cases, coverage analysis

### `/debug [error/issue]`
**Purpose**: Systematic debugging with root cause analysis  
**When to use**:
- Fixing bugs
- Understanding errors
- Tracing issues
- Finding patterns in failures

**Output**: Debug report, root cause, solution steps, prevention measures

### `/context [task/area]`
**Purpose**: Load relevant project context intelligently  
**When to use**:
- Starting new chat session
- Switching task focus
- Need project overview
- Understanding current state

**Output**: Curated context from docs, relevant standards, action items

## 🔧 Shell Scripts

Located in `.claude/scripts/` - Run from terminal

### `update_prompts.sh`
```bash
# Initialize (first time only)
./update_prompts.sh --init

# Regular runs (weekly)
./update_prompts.sh
```
**Purpose**: Auto-evolve prompts based on usage patterns  
**When to use**: Weekly or after completing major features  
**What it does**: 
- Analyzes success patterns
- Updates prompt templates
- Suggests new commands
- Optimizes for your workflow

### `complexity_tracker.sh [path]`
```bash
# Track current project
./complexity_tracker.sh

# Track specific directory
./complexity_tracker.sh ~/my-project
```
**Purpose**: Monitor codebase growth and complexity  
**When to use**: 
- Daily/weekly check-ins
- Before major refactoring
- Tracking technical debt
- Planning sprints

**Output**: File counts, complexity scores, language stats, recommendations

## 📡 API Endpoints

Backend running on `http://localhost:8000`

### Memory Operations
```bash
# Get all entities (v1.0 JSONL, v2.0 SQLite)
GET /api/entities

# Create entity
POST /api/entities
Body: { name, entityType, observations }

# Search entities (v2.0: Full-text search via SQLite FTS5)
GET /api/search?q=keyword

# Manage relations
GET/POST/DELETE /api/relations
```

### Framework Endpoints
```bash
# Get intelligent context (v2.0: Optimized with SQLite queries)
POST /api/framework/context
Body: { query, options }

# Analyze patterns
POST /api/framework/analyze
Body: { input }

# Get system stats (v2.0: Direct from SQLite)
GET /api/framework/stats

# Optimize memory (v2.0: SQLite VACUUM and indexes)
POST /api/framework/optimize
```

## 💻 NPM Scripts

Run from project root

### Development
```bash
# Start everything (frontend + backend) with auto-cleanup
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Process Management
npm run clean        # Clean up zombie processes
npm run status       # Check process status
npm run stop         # Stop all services
```

### Testing
```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run frontend tests  
npm run test:frontend

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Building & Setup
```bash
# Build for production
npm run build

# Install all dependencies
npm run setup

# Lint code
npm run lint
npm run lint:fix
```

## 🎮 Development Workflows

### Starting Your Day
```bash
# 1. Load context
claude /context "What needs attention today"

# 2. Check complexity
cd .claude/scripts && ./complexity_tracker.sh

# 3. Review current state
claude "Read @docs/context/CURRENT_STATE.md and summarize"
```

### Working on Features
```bash
# 1. Analyze area
claude /analyze src/feature

# 2. Generate tests first
claude /test "Create tests for new feature X"

# 3. Implement with TDD
claude "Implement feature X using TDD"

# 4. Refactor if needed
claude /refactor src/feature/implementation.js
```

### Debugging Issues
```bash
# 1. Debug systematically
claude /debug "Error: Cannot read property X"

# 2. Check recent changes
git log --oneline -10

# 3. Run specific tests
npm test -- --grep "failing test"
```

### End of Day
```bash
# 1. Update documentation
claude "Update @docs/context/CURRENT_STATE.md with today's progress"

# 2. Commit changes
git add . && git commit -m "feat: implement X"

# 3. Update patterns
claude "Update success patterns with what worked today"
```

## 🚀 Advanced Tools

### Prompt Plan Template
**Location**: `.claude/prompts/prompt_plan.md`  
**Use**: For complex multi-step projects
```bash
claude "Create a prompt plan for [PROJECT]"
claude "Execute @prompt_plan.md step by step"
```

### Spec Generator
**Location**: `.claude/prompts/spec_generator.md`  
**Use**: Convert ideas to detailed specifications
```bash
claude "Use @spec_generator.md to create spec for [IDEA]"
```

### TDD Framework
**Location**: `.claude/frameworks/tdd_framework.md`  
**Use**: Complete test-driven development guide
```bash
claude "Follow @tdd_framework.md for feature X"
```

## 🌐 Web UI Tools

Access at `http://localhost:5173` (or via VS Code Live Server)

### Entity Management
- Create/Edit/Delete entities
- Add observations
- Search and filter
- Bulk operations (coming soon)

### Relation Visualization
- View entity connections
- Create relations
- Navigate graph
- Export data

### Framework Controls
- Analyze input patterns
- View context tiers
- Check token usage
- Optimize retrieval

## 🔄 Git Integration

### Pre-commit Hook
```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
npm test || exit 1
.claude/scripts/complexity_tracker.sh
```

### Useful Aliases
```bash
# Add to ~/.gitconfig or .git/config
[alias]
    context = !claude /context
    analyze = !claude /analyze
    test = !claude /test
```

## 📊 Monitoring Tools

### System Health
```bash
# Check memory system health
curl http://localhost:8000/api/framework/health

# View stats
curl http://localhost:8000/api/framework/stats
```

### Logs
```bash
# View backend logs
tail -f logs/server.log

# View error logs
tail -f logs/error.log
```

## 🔧 Process Management Tools

### Process Manager (`scripts/process-manager.js`)
**Purpose**: Comprehensive process management and cleanup  
**Commands**:
```bash
node scripts/process-manager.js cleanup    # Kill zombie processes
node scripts/process-manager.js list       # Show process status
node scripts/process-manager.js start-backend
node scripts/process-manager.js start-frontend
node scripts/process-manager.js stop-all
```

### Unified Startup (`start-system.js`)
**Purpose**: Interactive startup with health checks  
**Usage**:
```bash
node start-system.js          # Interactive menu
node start-system.js all      # Start everything
node start-system.js cleanup  # Clean zombies
node start-system.js status   # Check processes
```

## 🆘 Troubleshooting Commands

### Reset Development Environment
```bash
# Clean everything and restart
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Fix Port Issues
```bash
# Use process manager
npm run clean

# Or manually kill ports
lsof -ti :8000 | xargs kill -9
lsof -ti :5173 | xargs kill -9
kill -9 [PID]
```

### Memory System Issues
```bash
# v1.0: Validate JSONL file
claude "Validate @memory/data/memory.jsonl"

# v2.0: Validate SQLite database
sqlite3 memory/data/memory.db "PRAGMA integrity_check;"

# Backup memory (v1.0)
cp memory/data/memory.jsonl memory/data/backup-$(date +%Y%m%d).jsonl

# Backup memory (v2.0)
sqlite3 memory/data/memory.db ".backup memory/backups/backup-$(date +%Y%m%d).db"
```

## 📝 Quick Reference Card

### Most Used Commands
```bash
claude /context          # Load project context
claude /analyze         # Analyze code
claude /test           # Generate tests
npm run dev            # Start development
git add . && git commit # Save progress
```

### Power Combos
```bash
# Full feature development
claude /context && claude /test && claude "implement with TDD"

# Complete refactor
claude /analyze && claude /refactor && claude /test

# Debug workflow
claude /debug && git diff && npm test
```

### Emergency Commands
```bash
# Something broke?
npm run clean && npm install

# Can't commit?
npm test -- --no-coverage

# Lost context?
claude /context "full refresh"
```

---

💡 **Pro Tip**: Print this document and keep it handy until these commands become muscle memory!

*Last updated: May 29, 2025*
