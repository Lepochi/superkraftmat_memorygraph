# Smart Refactoring Command

Refactor the code specified in $ARGUMENTS using advanced patterns and best practices.

<thinking>
I need to analyze the current code structure and identify:
1. Code smells and anti-patterns
2. Opportunities for abstraction
3. Performance improvements
4. Maintainability enhancements
</thinking>

## Refactoring Process:

### Phase 1: Analysis
- Identify code smells
- Map dependencies
- Assess current test coverage
- Note breaking change risks

### Phase 2: Planning
<refactor_plan>
1. **Safety First**
   - Ensure tests exist (create if missing)
   - Create backup branch
   - Document current behavior

2. **Incremental Changes**
   - Small, atomic refactors
   - Test after each change
   - Commit frequently

3. **Pattern Application**
   - Apply SOLID principles
   - Use appropriate design patterns
   - Optimize for readability
</refactor_plan>

### Phase 3: Implementation
- Make changes incrementally
- Run tests continuously
- Update documentation
- Create migration guide if needed

## Output Template:

```markdown
## Refactoring Summary

### Changes Made:
1. [Change description] - [Reason]
2. [Change description] - [Reason]

### Performance Impact:
- Before: [metrics]
- After: [metrics]
- Improvement: [percentage]

### Code Quality Metrics:
- Complexity reduced by: X%
- Test coverage: X% → Y%
- Duplication eliminated: X lines

### Breaking Changes:
[List any breaking changes with migration steps]

### Next Steps:
[Suggested follow-up refactors]
```

## Auto-Evolution:
Track successful refactoring patterns and add them to the knowledge base.

$ARGUMENTS
