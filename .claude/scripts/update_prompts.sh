#!/bin/bash

# Auto-Update Prompts Script
# This script analyzes usage patterns and updates prompts for better effectiveness

CLAUDE_DIR="$HOME/superkraft_memory/.claude"
METRICS_DIR="$CLAUDE_DIR/metrics"
PROMPTS_DIR="$CLAUDE_DIR/prompts"
COMMANDS_DIR="$CLAUDE_DIR/commands"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Claude Code Auto-Update System${NC}"
echo "=========================================="

# Initialize if first run
if [ "$1" == "--init" ]; then
    echo -e "${YELLOW}Initializing metrics system...${NC}"
    
    # Create metrics directory if it doesn't exist
    mkdir -p "$METRICS_DIR"
    
    # Initialize complexity log
    if [ ! -f "$METRICS_DIR/complexity_log.json" ]; then
        echo '{
  "initialized": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "projects": {},
  "patterns": {
    "successful_prompts": [],
    "failed_prompts": [],
    "common_refactors": [],
    "test_patterns": []
  },
  "thresholds": {
    "complexity_trigger": 100,
    "prompt_success_rate": 0.8,
    "test_coverage_target": 0.8
  }
}' > "$METRICS_DIR/complexity_log.json"
    fi
    
    # Initialize success patterns
    if [ ! -f "$METRICS_DIR/success_patterns.json" ]; then
        echo '{
  "patterns": {
    "high_impact_commands": [],
    "effective_prompts": [],
    "common_workflows": []
  },
  "learning": {
    "last_updated": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "total_interactions": 0,
    "success_rate": 0
  }
}' > "$METRICS_DIR/success_patterns.json"
    fi
    
    echo -e "${GREEN}✅ Initialization complete!${NC}"
    exit 0
fi

# Function to analyze project complexity
analyze_complexity() {
    local project_path="${1:-$(pwd)}"
    local complexity=0
    
    # Count files
    local file_count=$(find "$project_path" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" \) 2>/dev/null | wc -l)
    complexity=$((complexity + file_count))
    
    # Count lines of code (simple approach)
    local loc=$(find "$project_path" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" \) -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
    complexity=$((complexity + loc / 100))
    
    # Check for test files
    local test_count=$(find "$project_path" -type f \( -name "*test*" -o -name "*spec*" \) 2>/dev/null | wc -l)
    
    echo "$complexity"
}

# Function to suggest new commands based on complexity
suggest_commands() {
    local complexity=$1
    local suggestions=""
    
    if [ $complexity -gt 50 ] && [ ! -f "$COMMANDS_DIR/architect.md" ]; then
        suggestions="${suggestions}Consider adding: architect.md for system design decisions\n"
    fi
    
    if [ $complexity -gt 100 ] && [ ! -f "$COMMANDS_DIR/performance.md" ]; then
        suggestions="${suggestions}Consider adding: performance.md for optimization workflows\n"
    fi
    
    if [ $complexity -gt 150 ] && [ ! -f "$COMMANDS_DIR/security.md" ]; then
        suggestions="${suggestions}Consider adding: security.md for security audits\n"
    fi
    
    if [ -n "$suggestions" ]; then
        echo -e "${YELLOW}📝 Suggestions based on complexity ($complexity):${NC}"
        echo -e "$suggestions"
    fi
}

# Function to update prompt templates based on patterns
update_prompt_templates() {
    echo -e "${GREEN}📊 Analyzing usage patterns...${NC}"
    
    # Read current metrics
    if [ -f "$METRICS_DIR/complexity_log.json" ]; then
        # Extract patterns using jq or python
        if command -v python3 &> /dev/null; then
            python3 << EOF
import json
import os
from datetime import datetime

metrics_file = "$METRICS_DIR/complexity_log.json"
with open(metrics_file, 'r') as f:
    data = json.load(f)

# Analyze patterns
patterns = data.get('patterns', {})
successful = patterns.get('successful_prompts', [])

if len(successful) > 10:
    print("🎯 Found", len(successful), "successful prompt patterns")
    
    # Create optimized prompt template
    optimized_prompt = """# Optimized Prompt Template
# Generated on: """ + datetime.now().isoformat() + """
# Based on: """ + str(len(successful)) + """ successful interactions

## Proven Patterns:
"""
    
    # Add top patterns
    for i, pattern in enumerate(successful[-5:], 1):
        optimized_prompt += f"### Pattern {i}: {pattern.get('type', 'Unknown')}\n"
        optimized_prompt += f"{pattern.get('template', '')}\n\n"
    
    # Write optimized template
    output_path = "$PROMPTS_DIR/optimized_template.md"
    with open(output_path, 'w') as f:
        f.write(optimized_prompt)
    
    print("✅ Created optimized template at:", output_path)

EOF
        fi
    fi
}

# Function to create complexity report
generate_report() {
    local complexity=$(analyze_complexity)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo -e "${GREEN}📈 Complexity Analysis Report${NC}"
    echo "=============================="
    echo "Timestamp: $timestamp"
    echo "Complexity Score: $complexity"
    echo ""
    
    # Provide recommendations based on complexity
    if [ $complexity -lt 50 ]; then
        echo "Status: Simple project - Basic commands sufficient"
    elif [ $complexity -lt 100 ]; then
        echo "Status: Medium complexity - Consider adding specialized commands"
    elif [ $complexity -lt 200 ]; then
        echo "Status: Complex project - Implement advanced patterns"
    else
        echo "Status: Beast mode required - Full automation recommended"
    fi
    
    echo ""
    suggest_commands $complexity
}

# Function to update Claude desktop config if needed
update_claude_config() {
    echo -e "${GREEN}🔧 Checking Claude Desktop configuration...${NC}"
    
    local config_file="$HOME/.config/claude/claude_desktop_config.json"
    
    if [ -f "$config_file" ]; then
        echo "✅ Configuration found"
        # Could add logic here to update config based on new commands
    else
        echo -e "${YELLOW}⚠️  Claude Desktop config not found${NC}"
        echo "Make sure Claude Desktop can access: $CLAUDE_DIR"
    fi
}

# Main execution
echo -e "${GREEN}Starting auto-update process...${NC}"
echo ""

# Generate complexity report
generate_report

# Update templates based on patterns
update_prompt_templates

# Check configuration
update_claude_config

echo ""
echo -e "${GREEN}✅ Auto-update complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review any new suggested commands"
echo "2. Check optimized templates in $PROMPTS_DIR"
echo "3. Run 'claude /analyze' to test improvements"

# Schedule next run reminder
echo ""
echo -e "${YELLOW}📅 Remember to run this weekly for best results${NC}"
echo "Add to cron: 0 9 * * 1 $0"
