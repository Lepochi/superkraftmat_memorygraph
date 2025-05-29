# Code Analysis Command

Analyze the codebase or specific files provided in $ARGUMENTS. Follow this systematic approach:

<thinking>
First, I need to understand what needs to be analyzed. Let me identify:
1. The scope of analysis (full codebase, specific files, or features)
2. Key patterns and architectures in use
3. Potential issues or improvements
4. Dependencies and their health
</thinking>

## Analysis Steps:

1. **Structure Analysis**
   - Map the project structure
   - Identify core components
   - Note architectural patterns

2. **Code Quality Check**
   - Complexity metrics
   - Code duplication
   - Naming conventions
   - Comment coverage

3. **Performance Indicators**
   - Potential bottlenecks
   - Resource usage patterns
   - Optimization opportunities

4. **Security Scan**
   - Common vulnerabilities
   - Input validation
   - Authentication/authorization patterns

5. **Test Coverage**
   - Existing test suites
   - Coverage gaps
   - Test quality assessment

6. **Dependency Analysis**
   - Version currency
   - Security advisories
   - Unused dependencies

## Output Format:

<analysis>
### 📊 Project Health Score: [X/10]

### ✅ Strengths
- [List key strengths]

### ⚠️ Areas for Improvement
- [List with priority levels]

### 🚨 Critical Issues
- [If any, with fix recommendations]

### 💡 Recommendations
1. [Actionable improvements]
2. [Ordered by impact]

### 📈 Complexity Metrics
- Files analyzed: X
- Total lines: X
- Cyclomatic complexity: X
- Technical debt estimate: X hours
</analysis>

## Auto-Update Trigger:
If complexity exceeds threshold, suggest creating new specialized commands.

$ARGUMENTS
