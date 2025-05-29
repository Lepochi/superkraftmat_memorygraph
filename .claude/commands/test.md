# Test-Driven Development Command

Create or enhance tests for $ARGUMENTS following TDD best practices.

<thinking>
Let me analyze what needs testing:
1. Current test coverage
2. Critical paths that need tests
3. Edge cases to consider
4. Test structure and organization
</thinking>

## TDD Workflow:

### Step 1: Write Failing Tests
```javascript
// Example structure
describe('[Feature/Component]', () => {
  it('should [expected behavior]', () => {
    // Arrange
    // Act  
    // Assert
  });
});
```

### Step 2: Implementation Plan
1. Write minimal code to pass
2. Refactor for clarity
3. Add edge case tests
4. Repeat

### Step 3: Test Categories
- **Unit Tests**: Individual functions/methods
- **Integration Tests**: Component interactions  
- **E2E Tests**: User workflows
- **Performance Tests**: Speed/resource usage
- **Security Tests**: Input validation, auth

### Step 4: Coverage Analysis
- Target: 80%+ coverage
- Focus on critical paths
- Don't test implementation details
- Test behavior, not structure

## Test Generation Template:

<tests>
### Test Suite: [Name]

#### Happy Path Tests
- ✅ [Test description]
- ✅ [Test description]

#### Edge Cases
- 🔸 Null/undefined inputs
- 🔸 Empty collections
- 🔸 Boundary values
- 🔸 Concurrent operations

#### Error Scenarios
- ❌ Invalid inputs
- ❌ Network failures
- ❌ Permission denied
- ❌ Resource exhaustion

#### Performance Benchmarks
- ⚡ Response time < Xms
- ⚡ Memory usage < XMB
- ⚡ Handles X concurrent users
</tests>

## Auto-Learning:
- Track which tests catch most bugs
- Identify patterns in test failures
- Suggest test improvements based on history

## Next Actions:
1. Run test suite
2. Check coverage report
3. Add missing critical tests
4. Update CI/CD pipeline

$ARGUMENTS
