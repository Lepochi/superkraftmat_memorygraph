# 🛠️ Claude Code Commands Reference

## 📋 Quick Command Index

- [analyze](#analyze) - Systematic codebase analysis
- [context](#context) - Smart context loading
- [debug](#debug) - Intelligent debugging protocol  
- [refactor](#refactor) - Safe code refactoring
- [test](#test) - Comprehensive testing workflows

---

## 🔍 analyze
**Usage**: Analyze the codebase or specific files provided in $ARGUMENTS

### Analysis Steps:
1. **Structure Analysis** - Map project structure, identify core components
2. **Code Quality Check** - Review patterns, complexity, maintainability
3. **Security Review** - Check for vulnerabilities and best practices
4. **Performance Analysis** - Identify bottlenecks and optimization opportunities
5. **Documentation Review** - Assess documentation coverage and quality

### Output Format:
```markdown
## Analysis Results
### Architecture Overview
- [Key findings about structure]

### Code Quality
- [Issues and recommendations]

### Recommendations
- [Prioritized action items]
```

---

## 🎯 context
**Usage**: Load appropriate project context based on $ARGUMENTS or current task

### Smart Context Loading:
1. **Analyze Intent** - Determine work type (feature dev, debugging, docs, architecture)
2. **Load Core Context** - Always include PROJECT_CONTEXT.md and CURRENT_STATE.md
3. **Task-Specific Context** - Add relevant technical documentation
4. **Validation** - Ensure all necessary context is loaded

### Context Types:
- **Feature Development**: Current state + coding standards + architecture
- **Bug Fixing**: Current issues + relevant code areas + debugging guides
- **Architecture Planning**: Project context + technical debt + roadmap
- **Documentation**: All context files + style guides

---

## 🐛 debug
**Usage**: Debug the issue described in $ARGUMENTS using systematic analysis

### Debug Protocol:
1. **Information Gathering** - Collect error messages, stack traces, environment details
2. **Problem Reproduction** - Create minimal reproduction case
3. **Root Cause Analysis** - Trace issue to source using systematic elimination
4. **Solution Development** - Develop and test fixes
5. **Prevention Planning** - Identify measures to prevent recurrence

### Debug Template:
```markdown
## Debug Session: [Issue Description]
### Problem Statement
- [Clear description of issue]

### Root Cause
- [Identified cause]

### Solution
- [Implemented fix]

### Prevention
- [Measures to prevent recurrence]
```

---

## ♻️ refactor
**Usage**: Safely refactor code described in $ARGUMENTS

### Refactoring Protocol:
1. **Analysis** - Understand current code structure and behavior
2. **Test Coverage** - Ensure adequate test coverage before changes
3. **Incremental Changes** - Make small, testable modifications
4. **Validation** - Verify functionality after each change
5. **Documentation** - Update relevant documentation

### Safety Checklist:
- [ ] Tests pass before refactoring
- [ ] Changes are incremental and reversible
- [ ] Functionality is preserved
- [ ] Performance is maintained or improved
- [ ] Documentation is updated

---

## 🧪 test
**Usage**: Execute comprehensive testing workflows for $ARGUMENTS

### Testing Strategy:
1. **Test Planning** - Identify test scenarios and coverage requirements
2. **Unit Testing** - Test individual components in isolation
3. **Integration Testing** - Test component interactions
4. **End-to-End Testing** - Test complete user workflows
5. **Performance Testing** - Validate performance requirements

### Test Execution:
```bash
# Unit tests
npm test

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

### Test Reporting:
- Coverage percentage
- Failed test analysis
- Performance metrics
- Recommendations for improvement

---

## 🚀 Usage Examples

### Analyze entire codebase
```
/analyze "Full codebase review for security and performance"
```

### Load context for feature development
```
/context "Adding new user authentication feature"
```

### Debug specific error
```
/debug "TypeError: Cannot read property 'length' of undefined in user.js:42"
```

### Refactor component safely
```
/refactor "UserProfile component to use hooks instead of class components"
```

### Run comprehensive test suite
```
/test "Full test suite with coverage report"
```

---

*Commands are designed for systematic, thorough execution. Each command includes validation steps and clear output formats.*