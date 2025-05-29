# Intelligent Debug Command

Debug the issue described in $ARGUMENTS using systematic analysis.

<thinking>
I need to:
1. Understand the error/issue
2. Reproduce the problem
3. Identify root cause
4. Propose fixes
5. Prevent future occurrences
</thinking>

## Debug Protocol:

### Phase 1: Information Gathering
```xml
<debug_context>
  <error_message>[Exact error]</error_message>
  <stack_trace>[If available]</stack_trace>
  <reproduction_steps>[How to trigger]</reproduction_steps>
  <environment>[Dev/staging/prod]</environment>
  <recent_changes>[What changed recently]</recent_changes>
</debug_context>
```

### Phase 2: Systematic Analysis

1. **Reproduce the Issue**
   - Set up test environment
   - Follow reproduction steps
   - Confirm error occurs

2. **Narrow Down the Cause**
   - Binary search through code changes
   - Add strategic logging
   - Check external dependencies
   - Verify data integrity

3. **Root Cause Analysis**
   <thinking>
   - What is the immediate cause?
   - What is the underlying cause?
   - Why wasn't this caught earlier?
   - How can we prevent recurrence?
   </thinking>

### Phase 3: Solution Development

```markdown
## Debug Report

### 🐛 Issue Summary
[One-line description]

### 🔍 Root Cause
[Detailed explanation]

### 💡 Solution
[Step-by-step fix]

### 🛡️ Prevention
1. Add test case for this scenario
2. Update validation rules
3. Improve error handling
4. Add monitoring alert

### 📝 Code Changes
\`\`\`diff
- [old code]
+ [new code]
\`\`\`

### ✅ Verification Steps
1. [How to verify fix works]
2. [Edge cases to test]
```

## Debug Patterns Database:
- Store successful debug patterns
- Build error-to-solution mapping
- Suggest similar past issues

## Auto-Enhancement:
- Track time to resolution
- Identify common bug categories
- Suggest preventive measures

$ARGUMENTS
