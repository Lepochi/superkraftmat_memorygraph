#!/bin/bash

# Claude Code Multi-Agent Context Monitor Daemon
# Continuously monitors context usage and triggers automatic handoffs

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR="$SCRIPT_DIR/orchestrator.sh"
MONITOR_INTERVAL="${MONITOR_INTERVAL:-30}"  # Default: 30 seconds
DAEMON_LOG="$SCRIPT_DIR/../logs/monitor-daemon.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_daemon() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo -e "${BLUE}[MONITOR]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[MONITOR]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[MONITOR]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[MONITOR]${NC} $message"
            ;;
    esac
    
    echo "$timestamp [MONITOR-$level] $message" >> "$DAEMON_LOG"
}

# Signal handlers for graceful shutdown
cleanup() {
    log_daemon "INFO" "Monitor daemon shutting down..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Check if orchestrator exists
if [[ ! -f "$ORCHESTRATOR" ]]; then
    log_daemon "ERROR" "Orchestrator not found at $ORCHESTRATOR"
    exit 1
fi

# Make sure orchestrator is executable
chmod +x "$ORCHESTRATOR"

# Start monitoring
log_daemon "INFO" "Starting Claude Code Multi-Agent Context Monitor Daemon"
log_daemon "INFO" "Monitor interval: ${MONITOR_INTERVAL} seconds"
log_daemon "INFO" "Orchestrator: $ORCHESTRATOR"
log_daemon "INFO" "Daemon log: $DAEMON_LOG"

# Check if agents database is initialized
if ! "$ORCHESTRATOR" list >/dev/null 2>&1; then
    log_daemon "WARN" "Agent database not initialized. Running init..."
    "$ORCHESTRATOR" init
fi

# Main monitoring loop
iteration=0
while true; do
    iteration=$((iteration + 1))
    
    log_daemon "INFO" "Monitor iteration #$iteration"
    
    # Check if any agents are active
    active_agents=$("$ORCHESTRATOR" list 2>/dev/null | grep -c "active" || echo "0")
    
    if [[ "$active_agents" -eq 0 ]]; then
        log_daemon "INFO" "No active agents to monitor"
    else
        log_daemon "INFO" "Monitoring $active_agents active agents"
        
        # Run context monitoring
        if "$ORCHESTRATOR" monitor 2>&1 | while read -r line; do
            # Filter and log monitoring output
            if [[ "$line" == *"WARNING"* ]]; then
                log_daemon "WARN" "$line"
            elif [[ "$line" == *"ERROR"* ]]; then
                log_daemon "ERROR" "$line"
            elif [[ "$line" == *"SUCCESS"* ]]; then
                log_daemon "SUCCESS" "$line"
            elif [[ "$line" == *"context usage"* ]]; then
                log_daemon "INFO" "$line"
            fi
        done; then
            log_daemon "INFO" "Context monitoring completed successfully"
        else
            log_daemon "ERROR" "Context monitoring failed"
        fi
        
        # Clean up any dead agents
        "$ORCHESTRATOR" cleanup >/dev/null 2>&1 || true
    fi
    
    # Wait for next iteration
    log_daemon "INFO" "Waiting ${MONITOR_INTERVAL} seconds until next check..."
    sleep "$MONITOR_INTERVAL"
done