#!/bin/bash

# Agent Activator
# Starts Claude Code in each agent's tmux session with their specialized context

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR="$SCRIPT_DIR/orchestrator.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[ACTIVATE]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[ACTIVATE]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[ACTIVATE]${NC} $1"
}

log_error() {
    echo -e "${RED}[ACTIVATE]${NC} $1"
}

log_info "🚀 Activating optimization agents..."

# Get active agents
agents=$("$ORCHESTRATOR" list | grep "active" | awk '{print $1}' || echo "")

if [[ -z "$agents" ]]; then
    log_error "No active agents found. Run spawn-optimizer-team.sh first."
    exit 1
fi

echo ""
log_info "Found active agents:"
echo "$agents" | while read agent; do
    if [[ -n "$agent" ]]; then
        echo "  • $agent"
    fi
done

echo ""
log_info "Starting Claude Code in each agent session..."

# Activate each agent
echo "$agents" | while read agent_id; do
    if [[ -n "$agent_id" ]]; then
        agent_type=$(echo "$agent_id" | sed 's/-[0-9]*-[0-9]*$//')
        
        log_info "🔧 Activating $agent_type agent: $agent_id"
        
        # Start Claude Code with the agent's context
        "$ORCHESTRATOR" send "$agent_id" "cd /Users/lepochi/superkraft_memory"
        sleep 1
        "$ORCHESTRATOR" send "$agent_id" "claude"
        sleep 2
        
        # Give agent their initial task based on type
        case "$agent_type" in
            "claude-md-specialist")
                initial_task="Analyze CLAUDE.md for optimization opportunities. Focus on: 1) Accuracy of all facts and progress percentages, 2) Context efficiency (reduce tokens while maintaining effectiveness), 3) Clarity improvements. Start by reading the current CLAUDE.md file."
                ;;
            "optimizer")
                initial_task="Analyze system performance and identify optimization opportunities. Start by examining recent logs, git history, and system metrics to understand current performance patterns."
                ;;
            "prompt-engineer")
                initial_task="Review agent templates in .claude-agents/config/ directory. Analyze their effectiveness and identify opportunities for improvement in clarity, context efficiency, and behavioral conditioning."
                ;;
            "architecture-analyst")
                initial_task="Analyze the current system architecture. Review the project structure, component relationships, and workflow patterns to identify optimization opportunities."
                ;;
            *)
                initial_task="Begin your optimization work according to your specialization."
                ;;
        esac
        
        # Wait for Claude to start, then send initial task
        sleep 3
        log_info "📋 Assigning initial task to $agent_type..."
        
        # Send the task (this will appear in their Claude session)
        echo "Initial task for $agent_type: $initial_task" > "/tmp/agent_task_${agent_id}"
        
        log_success "✅ $agent_type activated with initial task"
        echo ""
    fi
done

echo ""
log_success "🎉 All agents activated!"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
log_info "📊 Monitor agent progress:"
echo "  Check agent output:     $ORCHESTRATOR output <agent-id> 20"
echo "  Monitor context usage:  $ORCHESTRATOR monitor"
echo "  Send custom tasks:      $ORCHESTRATOR send <agent-id> '<task>'"

echo ""
log_info "🔀 When agents complete work:"
echo "  Preview changes:        ./.claude-agents/scripts/merge-agent-work.sh preview"
echo "  Check branch status:    ./.claude-agents/scripts/merge-agent-work.sh status"
echo "  Merge all work:         ./.claude-agents/scripts/merge-agent-work.sh merge-all"

echo ""
log_warning "💡 Important Notes:"
echo "  • Each agent works in their own git branch (isolated from each other)"
echo "  • Changes won't appear in main branch until you merge them"
echo "  • Use the merge script to safely combine their work"
echo "  • Agents will automatically handoff when context reaches 85%"

echo ""
log_info "🎯 Expected Agent Behaviors:"
echo "  📚 CLAUDE.md Specialist: Will read and optimize CLAUDE.md"
echo "  ⚡ System Optimizer: Will analyze performance and suggest improvements"
echo "  🧠 Prompt Engineer: Will review and enhance agent templates"
echo "  🏗️ Architecture Analyst: Will analyze system structure and workflows"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "🚀 Optimization agents are now active and working!"