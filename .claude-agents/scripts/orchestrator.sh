#!/bin/bash

# Claude Code Multi-Agent Orchestrator
# Manages spawning, monitoring, and coordinating multiple Claude Code instances

set -e

# Configuration
AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$(cd "$AGENT_DIR/.." && pwd)"
STATE_DIR="$AGENT_DIR/state"
LOGS_DIR="$AGENT_DIR/logs"
CONFIG_DIR="$AGENT_DIR/config"
DB_FILE="$STATE_DIR/agents.db"
WORKTREES_DIR="$PROJECT_ROOT/../worktrees"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> "$LOGS_DIR/orchestrator.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$LOGS_DIR/orchestrator.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> "$LOGS_DIR/orchestrator.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> "$LOGS_DIR/orchestrator.log"
}

# Initialize SQLite database with required tables
init_db() {
    log_info "Initializing Claude Agent database..."
    
    # Create directories if they don't exist
    mkdir -p "$STATE_DIR" "$LOGS_DIR" "$WORKTREES_DIR"
    
    # Initialize SQLite database
    sqlite3 "$DB_FILE" << 'EOF'
-- Agents table: Track active agent instances
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    agent_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    tmux_session TEXT NOT NULL,
    worktree_path TEXT NOT NULL,
    git_branch TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context_usage INTEGER DEFAULT 0,
    specialization TEXT,
    current_task TEXT
);

-- Agent tasks: Task assignment and progress tracking
CREATE TABLE IF NOT EXISTS agent_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    task_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Shared context: Inter-agent communication and state
CREATE TABLE IF NOT EXISTS shared_context (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    agent_id TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    context_type TEXT DEFAULT 'general'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_context_type ON shared_context(context_type);
CREATE INDEX IF NOT EXISTS idx_context_agent ON shared_context(agent_id);
EOF

    # Insert initial shared context
    sqlite3 "$DB_FILE" << EOF
INSERT OR REPLACE INTO shared_context (key, value, context_type) VALUES 
    ('project_root', '$PROJECT_ROOT', 'system'),
    ('agent_dir', '$AGENT_DIR', 'system'),
    ('orchestrator_version', '1.0.0', 'system'),
    ('max_concurrent_agents', '5', 'config'),
    ('context_warning_threshold', '70', 'config'),
    ('context_handoff_threshold', '85', 'config');
EOF

    log_success "Database initialized at $DB_FILE"
    
    # Create initial shared context JSON
    cat > "$STATE_DIR/shared-context.json" << EOF
{
  "project": {
    "name": "Superkraft Memory System",
    "version": "2.0",
    "root_path": "$PROJECT_ROOT",
    "description": "High-performance knowledge graph with multi-agent Claude Code system"
  },
  "system": {
    "orchestrator_version": "1.0.0",
    "agent_directory": "$AGENT_DIR",
    "max_agents": 5,
    "context_thresholds": {
      "warning": 70,
      "handoff": 85,
      "critical": 90
    }
  },
  "agents": {
    "active_count": 0,
    "total_spawned": 0,
    "last_cleanup": null
  },
  "coordination": {
    "message_bus": "sqlite",
    "state_persistence": true,
    "auto_recovery": true
  }
}
EOF

    log_success "Shared context initialized at $STATE_DIR/shared-context.json"
}

# Generate unique agent ID
generate_agent_id() {
    local agent_type="$1"
    local timestamp=$(date +%s)
    # Use portable random number generation
    local random=$(( (RANDOM % 900) + 100 ))
    echo "${agent_type}-${timestamp}-${random}"
}

# Check if tmux session exists
tmux_session_exists() {
    local session_name="$1"
    if command -v tmux >/dev/null 2>&1; then
        tmux has-session -t "$session_name" 2>/dev/null
    else
        return 1
    fi
}

# Spawn a new agent with git worktree and tmux session
spawn_agent() {
    local agent_type="$1"
    local specialization="$2"
    local initial_task="$3"
    
    if [[ -z "$agent_type" ]]; then
        log_error "Agent type is required. Usage: spawn_agent <type> [specialization] [initial_task]"
        return 1
    fi
    
    # Check current agent count
    local current_agents=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM agents WHERE status = 'active'")
    local max_agents=$(sqlite3 "$DB_FILE" "SELECT value FROM shared_context WHERE key = 'max_concurrent_agents'" | head -1)
    
    if [[ "$current_agents" -ge "$max_agents" ]]; then
        log_error "Maximum number of agents ($max_agents) already running"
        return 1
    fi
    
    # Generate unique agent ID
    local agent_id=$(generate_agent_id "$agent_type")
    local tmux_session="claude-agent-$agent_id"
    local git_branch="agent-$agent_type-$(date +%s)"
    local worktree_path="$WORKTREES_DIR/$agent_id"
    
    log_info "Spawning $agent_type agent: $agent_id"
    
    # Create git worktree
    log_info "Creating git worktree at $worktree_path"
    cd "$PROJECT_ROOT"
    if ! git worktree add -b "$git_branch" "$worktree_path"; then
        log_error "Failed to create git worktree"
        return 1
    fi
    
    # Copy essential configuration files
    cp -f "$PROJECT_ROOT/.env" "$worktree_path/" 2>/dev/null || true
    cp -f "$PROJECT_ROOT/package.json" "$worktree_path/" 2>/dev/null || true
    
    # Create tmux session or alternative
    if command -v tmux >/dev/null 2>&1; then
        log_info "Creating tmux session: $tmux_session"
        tmux new-session -d -s "$tmux_session" -c "$worktree_path"
        
        # Set up agent environment in tmux session
        tmux send-keys -t "$tmux_session" "export CLAUDE_AGENT_ID='$agent_id'" C-m
        tmux send-keys -t "$tmux_session" "export CLAUDE_AGENT_TYPE='$agent_type'" C-m
        tmux send-keys -t "$tmux_session" "export CLAUDE_AGENT_SPECIALIZATION='$specialization'" C-m
        tmux send-keys -t "$tmux_session" "export AGENT_STATE_DIR='$STATE_DIR'" C-m
        tmux send-keys -t "$tmux_session" "export PROJECT_ROOT='$PROJECT_ROOT'" C-m
        
        # Load agent configuration if available
        local config_file="$CONFIG_DIR/${agent_type}-agent.md"
        if [[ -f "$config_file" ]]; then
            tmux send-keys -t "$tmux_session" "echo 'Loading agent configuration from $config_file'" C-m
            tmux send-keys -t "$tmux_session" "cat '$config_file'" C-m
        fi
    else
        log_warning "tmux not found. Creating worktree without tmux session."
        log_info "To manually access agent workspace: cd '$worktree_path'"
        
        # Create environment setup script instead
        cat > "$worktree_path/.agent-env.sh" << EOF
#!/bin/bash
export CLAUDE_AGENT_ID='$agent_id'
export CLAUDE_AGENT_TYPE='$agent_type'
export CLAUDE_AGENT_SPECIALIZATION='$specialization'
export AGENT_STATE_DIR='$STATE_DIR'
export PROJECT_ROOT='$PROJECT_ROOT'
echo "Agent environment loaded for $agent_id"
EOF
        chmod +x "$worktree_path/.agent-env.sh"
    fi
    
    # Register agent in database
    sqlite3 "$DB_FILE" << EOF
INSERT INTO agents (id, agent_type, tmux_session, worktree_path, git_branch, specialization, current_task)
VALUES ('$agent_id', '$agent_type', '$tmux_session', '$worktree_path', '$git_branch', '$specialization', '$initial_task');
EOF
    
    # Add initial task if provided
    if [[ -n "$initial_task" ]]; then
        sqlite3 "$DB_FILE" << EOF
INSERT INTO agent_tasks (agent_id, task_description, status)
VALUES ('$agent_id', '$initial_task', 'pending');
EOF
        log_info "Assigned initial task: $initial_task"
    fi
    
    # Update shared context
    local total_agents=$((current_agents + 1))
    sqlite3 "$DB_FILE" << EOF
INSERT OR REPLACE INTO shared_context (key, value, agent_id, context_type)
VALUES ('active_agent_count', '$total_agents', '$agent_id', 'system');
EOF
    
    log_success "Agent $agent_id spawned successfully"
    log_info "  Type: $agent_type"
    log_info "  Specialization: $specialization"
    log_info "  Tmux session: $tmux_session"
    log_info "  Worktree: $worktree_path"
    log_info "  Git branch: $git_branch"
    
    echo "$agent_id"
}

# List all agents with their status
list_agents() {
    log_info "Listing all Claude Code agents..."
    
    # Check if database exists
    if [[ ! -f "$DB_FILE" ]]; then
        log_warning "Agent database not found. Run 'init' first."
        return 1
    fi
    
    # Get agent list from database
    local agents_data=$(sqlite3 -header -column "$DB_FILE" "
        SELECT 
            id as 'Agent ID',
            agent_type as 'Type',
            specialization as 'Specialization',
            status as 'Status',
            tmux_session as 'Tmux Session',
            'Unknown' as 'Tmux Status',
            datetime(created_at, 'localtime') as 'Created',
            datetime(last_heartbeat, 'localtime') as 'Last Heartbeat'
        FROM agents 
        ORDER BY created_at DESC
    ")
    
    if [[ -z "$agents_data" ]]; then
        log_info "No agents found."
        return 0
    fi
    
    echo -e "\n${BLUE}Active Claude Code Agents:${NC}"
    echo "$agents_data"
    
    # Show summary
    local total_agents=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM agents")
    local active_agents=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM agents WHERE status = 'active'")
    local pending_tasks=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM agent_tasks WHERE status = 'pending'")
    
    echo -e "\n${BLUE}Summary:${NC}"
    echo "  Total agents: $total_agents"
    echo "  Active agents: $active_agents"
    echo "  Pending tasks: $pending_tasks"
}

# Kill an agent and cleanup resources
kill_agent() {
    local agent_id="$1"
    
    if [[ -z "$agent_id" ]]; then
        log_error "Agent ID is required. Usage: kill_agent <agent_id>"
        return 1
    fi
    
    log_info "Terminating agent: $agent_id"
    
    # Get agent details from database
    local agent_data=$(sqlite3 "$DB_FILE" "
        SELECT tmux_session, worktree_path, git_branch 
        FROM agents 
        WHERE id = '$agent_id' AND status = 'active'
    ")
    
    if [[ -z "$agent_data" ]]; then
        log_error "Agent $agent_id not found or already terminated"
        return 1
    fi
    
    # Parse agent data
    local tmux_session=$(echo "$agent_data" | cut -d'|' -f1)
    local worktree_path=$(echo "$agent_data" | cut -d'|' -f2)
    local git_branch=$(echo "$agent_data" | cut -d'|' -f3)
    
    # Kill tmux session
    if command -v tmux >/dev/null 2>&1 && tmux_session_exists "$tmux_session"; then
        log_info "Terminating tmux session: $tmux_session"
        tmux kill-session -t "$tmux_session"
    else
        log_info "No tmux session to terminate (tmux not available or session doesn't exist)"
    fi
    
    # Remove git worktree
    if [[ -d "$worktree_path" ]]; then
        log_info "Removing git worktree: $worktree_path"
        cd "$PROJECT_ROOT"
        git worktree remove "$worktree_path" --force
    fi
    
    # Delete git branch
    if git show-ref --verify --quiet "refs/heads/$git_branch"; then
        log_info "Deleting git branch: $git_branch"
        git branch -D "$git_branch"
    fi
    
    # Update agent status in database
    sqlite3 "$DB_FILE" << EOF
UPDATE agents 
SET status = 'terminated', last_heartbeat = CURRENT_TIMESTAMP 
WHERE id = '$agent_id';

UPDATE agent_tasks 
SET status = 'cancelled' 
WHERE agent_id = '$agent_id' AND status IN ('pending', 'running');
EOF
    
    log_success "Agent $agent_id terminated successfully"
}

# Parse context usage from tmux pane output
parse_context_usage() {
    local tmux_session="$1"
    
    if ! command -v tmux >/dev/null 2>&1 || ! tmux_session_exists "$tmux_session"; then
        echo "0"
        return
    fi
    
    # Capture pane content and search for context indicators
    local pane_content=$(tmux capture-pane -t "$tmux_session" -p 2>/dev/null || echo "")
    
    # Look for various context usage patterns from Claude Code
    local context_percentage=""
    
    # Pattern 1: Direct percentage indicator (e.g., "context: 75%")
    context_percentage=$(echo "$pane_content" | grep -oE "context[^0-9]*([0-9]{1,3})%" | tail -1 | grep -oE "[0-9]{1,3}")
    
    # Pattern 2: Context until auto-compact (e.g., "context until auto-compact: 85%")  
    if [[ -z "$context_percentage" ]]; then
        context_percentage=$(echo "$pane_content" | grep -oE "context until auto-compact[^0-9]*([0-9]{1,3})%" | tail -1 | grep -oE "[0-9]{1,3}")
    fi
    
    # Pattern 3: Memory usage indicator
    if [[ -z "$context_percentage" ]]; then
        context_percentage=$(echo "$pane_content" | grep -oE "memory.*([0-9]{1,3})%" | tail -1 | grep -oE "[0-9]{1,3}")
    fi
    
    # Default to 0 if no pattern found
    if [[ -z "$context_percentage" ]]; then
        echo "0"
    else
        echo "$context_percentage"
    fi
}

# Monitor context usage for all active agents
monitor_context_usage() {
    log_info "Monitoring context usage for all active agents..."
    
    local warning_threshold=$(sqlite3 "$DB_FILE" "SELECT value FROM shared_context WHERE key = 'context_warning_threshold'" | head -1)
    local handoff_threshold=$(sqlite3 "$DB_FILE" "SELECT value FROM shared_context WHERE key = 'context_handoff_threshold'" | head -1)
    
    # Get all active agents
    sqlite3 "$DB_FILE" "SELECT id, tmux_session, agent_type, specialization FROM agents WHERE status = 'active'" | while IFS='|' read -r agent_id tmux_session agent_type specialization; do
        
        local context_usage=$(parse_context_usage "$tmux_session")
        
        # Update context usage in database
        sqlite3 "$DB_FILE" << EOF
UPDATE agents 
SET context_usage = $context_usage, last_heartbeat = CURRENT_TIMESTAMP 
WHERE id = '$agent_id';
EOF
        
        log_info "Agent $agent_id: ${context_usage}% context usage"
        
        # Check thresholds
        if [[ "$context_usage" -ge "$handoff_threshold" ]]; then
            log_warning "Agent $agent_id context usage critical (${context_usage}% >= ${handoff_threshold}%)"
            log_info "Triggering automatic handoff for agent $agent_id"
            trigger_agent_handoff "$agent_id" "$agent_type" "$specialization"
            
        elif [[ "$context_usage" -ge "$warning_threshold" ]]; then
            log_warning "Agent $agent_id context usage warning (${context_usage}% >= ${warning_threshold}%)"
            
            # Log warning to shared context for other agents
            sqlite3 "$DB_FILE" << EOF
INSERT OR REPLACE INTO shared_context (key, value, agent_id, context_type)
VALUES ('context_warning_${agent_id}', '${context_usage}%', '$agent_id', 'warning');
EOF
        fi
    done
}

# Trigger automatic agent handoff when context threshold reached
trigger_agent_handoff() {
    local old_agent_id="$1"
    local agent_type="$2"
    local specialization="$3"
    
    log_info "Starting automatic handoff for agent $old_agent_id"
    
    # Get current task and state from old agent
    local current_task=$(sqlite3 "$DB_FILE" "SELECT current_task FROM agents WHERE id = '$old_agent_id'")
    local tmux_session=$(sqlite3 "$DB_FILE" "SELECT tmux_session FROM agents WHERE id = '$old_agent_id'")
    
    # Capture current state from tmux session (last 50 lines)
    local current_state=""
    if command -v tmux >/dev/null 2>&1 && tmux_session_exists "$tmux_session"; then
        current_state=$(tmux capture-pane -t "$tmux_session" -p -S -50 2>/dev/null | head -20 || echo "")
    fi
    
    # Store handoff context in database using temp files to avoid SQL injection
    echo "$current_task" > "/tmp/handoff_task_${old_agent_id}"
    echo "$current_state" > "/tmp/handoff_state_${old_agent_id}"
    
    sqlite3 "$DB_FILE" << EOF
INSERT INTO shared_context (key, value, agent_id, context_type) VALUES
    ('handoff_from_${old_agent_id}', readfile('/tmp/handoff_task_${old_agent_id}'), '$old_agent_id', 'handoff'),
    ('handoff_state_${old_agent_id}', readfile('/tmp/handoff_state_${old_agent_id}'), '$old_agent_id', 'handoff');
EOF
    
    # Clean up temp files
    rm -f "/tmp/handoff_task_${old_agent_id}" "/tmp/handoff_state_${old_agent_id}"
    
    # Spawn replacement agent
    log_info "Spawning replacement $agent_type agent..."
    local new_agent_id=$(spawn_agent "$agent_type" "$specialization" "Continue from context handoff: $current_task")
    
    if [[ -n "$new_agent_id" ]]; then
        log_success "New agent $new_agent_id spawned successfully"
        
        # Transfer state to new agent via shared context
        sqlite3 "$DB_FILE" << EOF
INSERT OR REPLACE INTO shared_context (key, value, agent_id, context_type) VALUES
    ('handoff_to_${new_agent_id}', 'Continuing from agent ${old_agent_id}', '$new_agent_id', 'handoff'),
    ('inherited_task_${new_agent_id}', '${current_task}', '$new_agent_id', 'task');
EOF
        
        # Terminate old agent
        log_info "Terminating old agent $old_agent_id"
        kill_agent "$old_agent_id"
        
        log_success "Agent handoff completed: $old_agent_id → $new_agent_id"
    else
        log_error "Failed to spawn replacement agent for $old_agent_id"
    fi
}

# Send command to agent tmux session
send_agent_command() {
    local agent_id="$1"
    local command="$2"
    
    if [[ -z "$agent_id" || -z "$command" ]]; then
        log_error "Agent ID and command are required. Usage: send_agent_command <agent_id> <command>"
        return 1
    fi
    
    # Get tmux session for agent
    local tmux_session=$(sqlite3 "$DB_FILE" "SELECT tmux_session FROM agents WHERE id = '$agent_id' AND status = 'active'")
    
    if [[ -z "$tmux_session" ]]; then
        log_error "Agent $agent_id not found or not active"
        return 1
    fi
    
    if command -v tmux >/dev/null 2>&1 && tmux_session_exists "$tmux_session"; then
        log_info "Sending command to agent $agent_id: $command"
        tmux send-keys -t "$tmux_session" "$command" C-m
        log_success "Command sent successfully"
    else
        log_error "tmux session $tmux_session not accessible"
        return 1
    fi
}

# Get agent output from tmux session
get_agent_output() {
    local agent_id="$1"
    local lines="${2:-20}"  # Default to last 20 lines
    
    if [[ -z "$agent_id" ]]; then
        log_error "Agent ID is required. Usage: get_agent_output <agent_id> [lines]"
        return 1
    fi
    
    # Get tmux session for agent
    local tmux_session=$(sqlite3 "$DB_FILE" "SELECT tmux_session FROM agents WHERE id = '$agent_id' AND status = 'active'")
    
    if [[ -z "$tmux_session" ]]; then
        log_error "Agent $agent_id not found or not active"
        return 1
    fi
    
    if command -v tmux >/dev/null 2>&1 && tmux_session_exists "$tmux_session"; then
        log_info "Capturing output from agent $agent_id (last $lines lines):"
        echo "--- Agent $agent_id Output ---"
        tmux capture-pane -t "$tmux_session" -p -S -"$lines" 2>/dev/null || echo "Unable to capture pane content"
        echo "--- End Output ---"
    else
        log_error "tmux session $tmux_session not accessible"
        return 1
    fi
}

# Cleanup terminated agents
cleanup_agents() {
    log_info "Cleaning up terminated agents..."
    
    # Find agents with dead tmux sessions
    local dead_agents=$(sqlite3 "$DB_FILE" "
        SELECT id, tmux_session 
        FROM agents 
        WHERE status = 'active'
    " | while IFS='|' read -r agent_id tmux_session; do
        if ! tmux_session_exists "$tmux_session"; then
            echo "$agent_id"
        fi
    done)
    
    if [[ -n "$dead_agents" ]]; then
        echo "$dead_agents" | while read -r agent_id; do
            log_warning "Found dead agent: $agent_id"
            kill_agent "$agent_id"
        done
    else
        log_info "No dead agents found"
    fi
}

# Show help
show_help() {
    echo "Claude Code Multi-Agent Orchestrator"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  init                           Initialize the agent system"
    echo "  spawn <type> [spec] [task]     Spawn a new agent"
    echo "  list                           List all agents"
    echo "  kill <agent_id>                Terminate an agent"
    echo "  cleanup                        Clean up terminated agents"
    echo "  monitor                        Monitor context usage for all agents"
    echo "  send <agent_id> <command>      Send command to agent tmux session"
    echo "  output <agent_id> [lines]      Get agent output (default: 20 lines)"
    echo "  help                           Show this help"
    echo ""
    echo "Agent Types:"
    echo "  memory                         Memory/knowledge graph management"
    echo "  dev                            Development and implementation"
    echo "  test                           Testing and validation"
    echo "  docs                           Documentation maintenance"
    echo ""
    echo "Context Monitoring:"
    echo "  - Warning threshold: 70% (configurable)"
    echo "  - Handoff threshold: 85% (configurable)"
    echo "  - Automatic agent rotation on critical usage"
    echo "  - State transfer via SQLite shared context"
    echo ""
    echo "Examples:"
    echo "  $0 init"
    echo "  $0 spawn dev backend 'Implement WebSocket feature'"
    echo "  $0 spawn memory knowledge-graph 'Update entity relationships'"
    echo "  $0 list"
    echo "  $0 monitor"
    echo "  $0 send dev-1638123456-789 'echo Hello Agent'"
    echo "  $0 output dev-1638123456-789 50"
    echo "  $0 kill dev-1638123456-789"
}

# Main command handler
main() {
    local command="$1"
    shift
    
    case "$command" in
        "init")
            init_db
            ;;
        "spawn")
            spawn_agent "$@"
            ;;
        "list")
            list_agents
            ;;
        "kill")
            kill_agent "$@"
            ;;
        "cleanup")
            cleanup_agents
            ;;
        "monitor")
            monitor_context_usage
            ;;
        "send")
            send_agent_command "$@"
            ;;
        "output")
            get_agent_output "$@"
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"