#!/bin/bash

# Self-Improving Agent Team Spawner
# Creates a specialized team of agents focused on continuous system optimization

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR="$SCRIPT_DIR/orchestrator.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[OPTIMIZER-TEAM]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OPTIMIZER-TEAM]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[OPTIMIZER-TEAM]${NC} $1"
}

log_error() {
    echo -e "${RED}[OPTIMIZER-TEAM]${NC} $1"
}

# Check if orchestrator is available
if [[ ! -f "$ORCHESTRATOR" ]]; then
    log_error "Orchestrator not found at $ORCHESTRATOR"
    exit 1
fi

log_info "🚀 Spawning Self-Improving Agent Team..."
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Initialize the agent system if needed
log_info "Initializing agent system..."
"$ORCHESTRATOR" init

echo ""
log_info "Spawning specialized optimization agents..."

# Agent 1: CLAUDE.md Specialist
log_info "📚 Spawning CLAUDE.md Specialist Agent..."
CLAUDE_MD_AGENT=$("$ORCHESTRATOR" spawn claude-md-specialist documentation "Continuously optimize and maintain CLAUDE.md for maximum effectiveness")
if [[ -n "$CLAUDE_MD_AGENT" ]]; then
    log_success "✅ CLAUDE.md Specialist spawned: $CLAUDE_MD_AGENT"
else
    log_error "❌ Failed to spawn CLAUDE.md Specialist"
    exit 1
fi

# Agent 2: System Optimizer
log_info "⚡ Spawning System Optimizer Agent..."
OPTIMIZER_AGENT=$("$ORCHESTRATOR" spawn optimizer system-optimization "Analyze system performance and implement continuous improvements")
if [[ -n "$OPTIMIZER_AGENT" ]]; then
    log_success "✅ System Optimizer spawned: $OPTIMIZER_AGENT"
else
    log_error "❌ Failed to spawn System Optimizer"
    exit 1
fi

# Agent 3: Prompt Engineer
log_info "🧠 Spawning Prompt Engineering Agent..."
PROMPT_AGENT=$("$ORCHESTRATOR" spawn prompt-engineer agent-templates "Continuously improve agent prompts and templates for better performance")
if [[ -n "$PROMPT_AGENT" ]]; then
    log_success "✅ Prompt Engineer spawned: $PROMPT_AGENT"
else
    log_error "❌ Failed to spawn Prompt Engineer"
    exit 1
fi

# Agent 4: Architecture Analyst
log_info "🏗️  Spawning Architecture Analyst Agent..."
ARCH_AGENT=$("$ORCHESTRATOR" spawn architecture-analyst system-architecture "Analyze and optimize system architecture and workflow patterns")
if [[ -n "$ARCH_AGENT" ]]; then
    log_success "✅ Architecture Analyst spawned: $ARCH_AGENT"
else
    log_error "❌ Failed to spawn Architecture Analyst"
    exit 1
fi

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "🎉 Self-Improving Agent Team Successfully Deployed!"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
log_info "Team Composition:"
echo -e "  ${PURPLE}📚 CLAUDE.md Specialist:${NC} $CLAUDE_MD_AGENT"
echo -e "  ${CYAN}⚡ System Optimizer:${NC} $OPTIMIZER_AGENT"
echo -e "  ${YELLOW}🧠 Prompt Engineer:${NC} $PROMPT_AGENT"
echo -e "  ${GREEN}🏗️  Architecture Analyst:${NC} $ARCH_AGENT"

echo ""
log_info "Team Capabilities:"
echo "  • Continuous CLAUDE.md optimization and accuracy monitoring"
echo "  • Real-time system performance analysis and improvement"
echo "  • Automated prompt engineering and template refinement"
echo "  • Architecture pattern analysis and workflow optimization"
echo "  • Cross-agent collaboration and knowledge sharing"
echo "  • Self-learning and adaptive improvement cycles"

echo ""
log_info "Monitoring Commands:"
echo "  Monitor all agents:     $ORCHESTRATOR monitor"
echo "  List active agents:     $ORCHESTRATOR list"
echo "  Get agent output:       $ORCHESTRATOR output <agent_id> [lines]"
echo "  Send agent command:     $ORCHESTRATOR send <agent_id> <command>"

echo ""
log_info "Setting up initial coordination tasks..."

# Give each agent their initial coordination tasks
"$ORCHESTRATOR" send "$CLAUDE_MD_AGENT" "echo 'CLAUDE.md Specialist ready for optimization work'"
"$ORCHESTRATOR" send "$OPTIMIZER_AGENT" "echo 'System Optimizer ready to analyze performance'"
"$ORCHESTRATOR" send "$PROMPT_AGENT" "echo 'Prompt Engineer ready to refine templates'"
"$ORCHESTRATOR" send "$ARCH_AGENT" "echo 'Architecture Analyst ready to optimize workflows'"

echo ""
log_success "🚀 Self-Improving Agent Team is now operational!"
log_info "The team will continuously work to make the system better, faster, and more effective."
log_warning "💡 Tip: Use '$ORCHESTRATOR monitor' to watch context usage and automatic handoffs"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "🎯 Mission: Continuous System Evolution and Optimization"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"