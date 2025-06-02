#!/bin/bash

# Auto-Documentation Framework Controller
# Simple interface for the self-updating documentation system

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR="$SCRIPT_DIR/system/automated-documentation-orchestrator.cjs"

case "$1" in
    start|init)
        echo "🚀 Initializing Automated Documentation Framework..."
        node "$ORCHESTRATOR" init
        ;;
    
    status)
        echo "📊 Checking system status..."
        node "$ORCHESTRATOR" status
        ;;
    
    update)
        echo "⚡ Triggering immediate documentation update..."
        node "$ORCHESTRATOR" update
        ;;
    
    restart)
        echo "🔄 Restarting framework..."
        node "$ORCHESTRATOR" restart
        ;;
    
    stop)
        echo "🛑 Stopping framework..."
        node "$ORCHESTRATOR" shutdown
        ;;
    
    *)
        echo "🤖 Automated Documentation Framework"
        echo ""
        echo "Usage: $0 {start|status|update|restart|stop}"
        echo ""
        echo "Commands:"
        echo "  start   - Initialize and start the framework"
        echo "  status  - Show system status and health"
        echo "  update  - Trigger immediate documentation update"
        echo "  restart - Restart the entire framework"
        echo "  stop    - Stop all components"
        echo ""
        echo "The framework automatically:"
        echo "  • Monitors file changes and git commits"
        echo "  • Updates documentation based on system state"
        echo "  • Preserves session context across CLI handoffs"
        echo "  • Learns patterns and optimizes update frequency"
        echo "  • Maintains perfect continuity for Claude Code"
        exit 1
        ;;
esac