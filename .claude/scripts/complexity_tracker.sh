#!/bin/bash

# Complexity Tracker Script
# Monitors codebase growth and triggers prompt updates

CLAUDE_DIR="$HOME/superkraft_memory/.claude"
METRICS_DIR="$CLAUDE_DIR/metrics"
PROJECT_PATH="${1:-$(pwd)}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Claude Code Complexity Tracker${NC}"
echo "====================================="

# Function to calculate cyclomatic complexity (simplified)
calculate_complexity() {
    local file="$1"
    local complexity=1  # Base complexity
    
    # Count decision points (if, else, case, for, while, etc.)
    if [ -f "$file" ]; then
        # Count keywords that increase complexity
        local ifs=$(grep -c "if\s*(" "$file" 2>/dev/null || echo 0)
        local elses=$(grep -c "else" "$file" 2>/dev/null || echo 0)
        local fors=$(grep -c "for\s*(" "$file" 2>/dev/null || echo 0)
        local whiles=$(grep -c "while\s*(" "$file" 2>/dev/null || echo 0)
        local cases=$(grep -c "case\s" "$file" 2>/dev/null || echo 0)
        
        complexity=$((complexity + ifs + elses + fors + whiles + cases))
    fi
    
    echo $complexity
}

# Function to analyze project metrics
analyze_project() {
    local path="$1"
    local project_name=$(basename "$path")
    
    echo -e "${GREEN}Analyzing: $project_name${NC}"
    
    # Initialize metrics
    local total_files=0
    local total_lines=0
    local total_complexity=0
    local test_files=0
    local doc_files=0
    
    # Language-specific analysis
    declare -A language_stats
    
    # Find all code files
    while IFS= read -r -d '' file; do
        ((total_files++))
        
        # Get file extension
        ext="${file##*.}"
        ((language_stats[$ext]++))
        
        # Count lines
        lines=$(wc -l < "$file" 2>/dev/null || echo 0)
        total_lines=$((total_lines + lines))
        
        # Calculate complexity
        complexity=$(calculate_complexity "$file")
        total_complexity=$((total_complexity + complexity))
        
        # Check if test file
        if [[ "$file" == *test* ]] || [[ "$file" == *spec* ]]; then
            ((test_files++))
        fi
        
    done < <(find "$path" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rs" \) -print0 2>/dev/null)
    
    # Count documentation files
    doc_files=$(find "$path" -type f -name "*.md" 2>/dev/null | wc -l)
    
    # Calculate metrics
    local avg_complexity=0
    if [ $total_files -gt 0 ]; then
        avg_complexity=$((total_complexity / total_files))
    fi
    
    local test_ratio=0
    if [ $total_files -gt 0 ]; then
        test_ratio=$(echo "scale=2; $test_files / $total_files" | bc)
    fi
    
    # Create timestamp
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Output results
    echo "📁 Total Files: $total_files"
    echo "📝 Total Lines: $total_lines"
    echo "🔧 Total Complexity: $total_complexity"
    echo "📊 Average Complexity: $avg_complexity"
    echo "🧪 Test Files: $test_files (ratio: $test_ratio)"
    echo "📚 Documentation Files: $doc_files"
    
    echo ""
    echo "Language Distribution:"
    for lang in "${!language_stats[@]}"; do
        echo "  - .$lang: ${language_stats[$lang]} files"
    done
    
    # Store metrics
    store_metrics "$project_name" "$timestamp" "$total_files" "$total_lines" "$total_complexity" "$test_ratio"
    
    # Generate recommendations
    generate_recommendations "$total_complexity" "$avg_complexity" "$test_ratio"
}

# Function to store metrics in JSON
store_metrics() {
    local project="$1"
    local timestamp="$2"
    local files="$3"
    local lines="$4"
    local complexity="$5"
    local test_ratio="$6"
    
    # Ensure metrics directory exists
    mkdir -p "$METRICS_DIR"
    
    # Use Python for JSON manipulation
    python3 << EOF
import json
import os

metrics_file = "$METRICS_DIR/complexity_log.json"

# Load existing data or create new
if os.path.exists(metrics_file):
    with open(metrics_file, 'r') as f:
        data = json.load(f)
else:
    data = {
        "initialized": "$timestamp",
        "projects": {},
        "patterns": {},
        "thresholds": {
            "complexity_trigger": 100,
            "prompt_success_rate": 0.8,
            "test_coverage_target": 0.8
        }
    }

# Update project data
if "$project" not in data["projects"]:
    data["projects"]["$project"] = {
        "history": [],
        "trends": {}
    }

# Add current metrics
current_metrics = {
    "timestamp": "$timestamp",
    "files": $files,
    "lines": $lines,
    "complexity": $complexity,
    "test_ratio": $test_ratio
}

data["projects"]["$project"]["history"].append(current_metrics)

# Keep only last 30 entries
data["projects"]["$project"]["history"] = data["projects"]["$project"]["history"][-30:]

# Calculate trends
history = data["projects"]["$project"]["history"]
if len(history) > 1:
    prev = history[-2]
    curr = history[-1]
    
    data["projects"]["$project"]["trends"] = {
        "complexity_change": curr["complexity"] - prev["complexity"],
        "file_growth": curr["files"] - prev["files"],
        "test_ratio_change": curr["test_ratio"] - prev["test_ratio"]
    }

# Save updated data
with open(metrics_file, 'w') as f:
    json.dump(data, f, indent=2)

print("✅ Metrics saved to:", metrics_file)
EOF
}

# Function to generate recommendations
generate_recommendations() {
    local complexity="$1"
    local avg_complexity="$2"
    local test_ratio="$3"
    
    echo ""
    echo -e "${YELLOW}📋 Recommendations:${NC}"
    
    # Complexity-based recommendations
    if [ $complexity -gt 200 ]; then
        echo "⚠️  High complexity detected!"
        echo "   - Consider architectural refactoring"
        echo "   - Use /refactor command for complex modules"
        echo "   - Enable advanced Claude Code patterns"
    elif [ $complexity -gt 100 ]; then
        echo "📈 Medium complexity - optimize prompts"
        echo "   - Use specialized commands for common tasks"
        echo "   - Consider breaking down large modules"
    fi
    
    # Average complexity recommendations
    if [ $avg_complexity -gt 10 ]; then
        echo "🔄 High average complexity per file"
        echo "   - Split complex functions"
        echo "   - Extract reusable components"
    fi
    
    # Test coverage recommendations
    if (( $(echo "$test_ratio < 0.3" | bc -l) )); then
        echo "🧪 Low test coverage detected"
        echo "   - Use /test command to generate tests"
        echo "   - Enable TDD workflow in Claude Code"
    fi
    
    # Generate prompt optimization suggestion
    echo ""
    echo -e "${GREEN}🚀 Optimization Command:${NC}"
    echo "claude \"Analyze @$METRICS_DIR/complexity_log.json and optimize the prompts in @$CLAUDE_DIR/prompts/ based on the trends\""
}

# Function to track prompt effectiveness
track_prompt_effectiveness() {
    echo ""
    echo -e "${BLUE}📈 Prompt Effectiveness Tracking${NC}"
    
    # This would integrate with Claude's actual usage
    # For now, we'll create a template for manual tracking
    
    cat << EOF > "$METRICS_DIR/prompt_tracking_template.md"
# Prompt Effectiveness Tracking

## Date: $(date +"%Y-%m-%d")

### Successful Prompts
Record prompts that produced excellent results:

1. **Prompt**: [paste prompt]
   **Result Quality**: [1-10]
   **Time Saved**: [estimate]
   **Pattern**: [what made it work]

2. **Prompt**: [paste prompt]
   **Result Quality**: [1-10]
   **Time Saved**: [estimate]
   **Pattern**: [what made it work]

### Failed/Suboptimal Prompts
Record prompts that needed improvement:

1. **Prompt**: [paste prompt]
   **Issue**: [what went wrong]
   **Improvement**: [how to fix]

### Patterns Observed
- [Pattern 1]
- [Pattern 2]

### Recommendations for Prompt Updates
- [Recommendation 1]
- [Recommendation 2]
EOF

    echo "✅ Created tracking template at: $METRICS_DIR/prompt_tracking_template.md"
}

# Main execution
analyze_project "$PROJECT_PATH"
track_prompt_effectiveness

echo ""
echo -e "${GREEN}✅ Complexity tracking complete!${NC}"
echo ""
echo "Next actions:"
echo "1. Review recommendations above"
echo "2. Update prompts if complexity increased significantly"
echo "3. Run weekly: $0 $PROJECT_PATH"
echo ""
echo "💡 Tip: Add to git hooks for automatic tracking:"
echo "   echo '$0' >> .git/hooks/post-commit"
