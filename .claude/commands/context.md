# Context Loading Command

Load the appropriate project context based on $ARGUMENTS or current task.

<thinking>
I need to intelligently load context based on what the user is working on:
1. Always load PROJECT_CONTEXT.md for overview
2. Check CURRENT_STATE.md for active work
3. Load CODING_STANDARDS.md if writing code
4. Reference specific docs based on the task
</thinking>

## Smart Context Loading

### Step 1: Analyze Intent
Determine what kind of work is being done:
- **Feature Development**: Load current state + coding standards
- **Bug Fixing**: Load current issues + relevant code areas
- **Architecture Planning**: Load project context + technical debt
- **Documentation**: Load all context files

### Step 2: Load Core Context
```markdown
## System Overview
[Summary from PROJECT_CONTEXT.md]

## Current Focus
[Active items from CURRENT_STATE.md]

## Relevant Standards
[Applicable sections from CODING_STANDARDS.md]
```

### Step 3: Task-Specific Context

#### For Feature Development:
- Current sprint goals
- Related entities in memory system
- Existing patterns to follow
- Test requirements

#### For Bug Fixing:
- Known issues list
- Recent changes
- Error patterns
- Debug history

#### For Refactoring:
- Technical debt items
- Performance bottlenecks
- Code quality metrics
- Architecture decisions

## Context Loading Strategy

<context_analysis>
1. **Query Analysis**
   - Extract keywords from $ARGUMENTS
   - Identify task type
   - Determine context tier needs

2. **Priority Loading**
   - Tier 1: Business context (if strategic)
   - Tier 2: Project status (if tactical)
   - Tier 3: Technical details (if implementing)

3. **Optimization**
   - Load only relevant sections
   - Summarize verbose content
   - Highlight action items
</context_analysis>

## Output Format

```markdown
## 🎯 Context Loaded for: [TASK TYPE]

### 📋 Key Information
- **Project**: Superkraftmat Memory System
- **Current Phase**: [From CURRENT_STATE.md]
- **Your Focus**: [Interpreted from arguments]

### 🔍 Relevant Context
[Curated sections from context docs]

### ⚡ Quick Actions
1. [Suggested next step]
2. [Alternative approach]
3. [Related command to run]

### 📚 Additional Resources
- Full context: @docs/context/
- Project state: @docs/context/CURRENT_STATE.md
- Standards: @docs/context/CODING_STANDARDS.md
```

## Auto-Enhancement
Track which context sections are most useful and prioritize them in future loads.

$ARGUMENTS
