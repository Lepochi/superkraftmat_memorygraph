# Test-Driven Development Framework for Claude Code

## 🎯 Philosophy

TDD with Claude Code transforms development from "write code, then test" to "define behavior, then implement." This framework makes Claude Code significantly more effective by providing clear success criteria.

## 🔄 The Claude Code TDD Cycle

### 1. RED Phase - Write Failing Tests
```bash
claude "Create a failing test for [FEATURE]. The test should define expected behavior without implementation."
```

Example output:
```javascript
describe('UserAuthentication', () => {
  it('should hash passwords before storage', async () => {
    const plainPassword = 'mySecurePassword123';
    const user = await User.create({ 
      email: 'test@example.com',
      password: plainPassword 
    });
    
    expect(user.password).not.toBe(plainPassword);
    expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt pattern
  });
});
```

### 2. GREEN Phase - Minimal Implementation
```bash
claude "Implement the minimal code to make the test pass. Do not add extra features."
```

### 3. REFACTOR Phase - Improve Code Quality
```bash
claude "Refactor the implementation for better structure, performance, and readability while keeping tests green."
```

## 📋 Test Categories & Templates

### Unit Tests
```javascript
// Template for unit tests
describe('[ModuleName]', () => {
  describe('[methodName]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = setupTestData();
      
      // Act
      const result = moduleMethod(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });
    
    it('should handle edge case: [case description]', () => {
      // Edge case testing
    });
  });
});
```

### Integration Tests
```javascript
// Template for integration tests
describe('[Feature] Integration', () => {
  beforeEach(async () => {
    // Setup test database
    // Initialize services
  });
  
  afterEach(async () => {
    // Cleanup
  });
  
  it('should [complete workflow description]', async () => {
    // Test full feature flow
  });
});
```

### E2E Tests
```javascript
// Template for E2E tests
describe('[User Journey]', () => {
  it('should allow user to [complete action]', async () => {
    // Simulate user actions
    // Verify results
  });
});
```

## 🚀 Claude Code TDD Commands

### Generate Test Suite
```bash
claude "Analyze [FILE/FEATURE] and generate comprehensive test suite following TDD principles. Include:
- Happy path tests
- Edge cases
- Error scenarios
- Performance benchmarks
Structure tests using Arrange-Act-Assert pattern."
```

### Convert Requirements to Tests
```bash
claude "Convert these requirements into executable tests:
[PASTE REQUIREMENTS]
Use behavior-driven test descriptions."
```

### Test Coverage Analysis
```bash
claude "Analyze test coverage for [MODULE] and identify:
1. Untested code paths
2. Missing edge cases
3. Integration gaps
Generate tests for missing coverage."
```

## 📊 Test Quality Metrics

### What Makes a Good Test:
1. **Fast** - Runs in milliseconds
2. **Independent** - No dependencies on other tests
3. **Repeatable** - Same result every time
4. **Self-Validating** - Clear pass/fail
5. **Timely** - Written before code

### Claude Code Test Quality Prompt:
```bash
claude "Review these tests and rate them on FIRST principles:
[PASTE TESTS]
Suggest improvements for any violations."
```

## 🔧 Advanced TDD Patterns

### 1. Test Data Builders
```javascript
// Builder pattern for test data
class UserBuilder {
  constructor() {
    this.data = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'user'
    };
  }
  
  withEmail(email) {
    this.data.email = email;
    return this;
  }
  
  withRole(role) {
    this.data.role = role;
    return this;
  }
  
  build() {
    return new User(this.data);
  }
}

// Usage in tests
const adminUser = new UserBuilder()
  .withRole('admin')
  .withEmail('admin@example.com')
  .build();
```

### 2. Parameterized Tests
```javascript
describe.each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 2, 4],
])('add(%i, %i)', (a, b, expected) => {
  test(`returns ${expected}`, () => {
    expect(add(a, b)).toBe(expected);
  });
});
```

### 3. Contract Testing
```javascript
// Define contract
const userContract = {
  id: expect.any(Number),
  email: expect.any(String),
  createdAt: expect.any(Date)
};

// Test against contract
expect(user).toMatchObject(userContract);
```

## 🎨 TDD Workflow Automation

### Git Hook Integration
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run tests before commit
npm test || {
  echo "Tests failed. Commit aborted."
  exit 1
}

# Check test coverage
coverage=$(npm run coverage | grep "All files" | awk '{print $4}' | sed 's/%//')
if [ $coverage -lt 80 ]; then
  echo "Coverage below 80%. Current: $coverage%"
  exit 1
fi
```

### Continuous TDD with Claude Code
```bash
# Watch mode script
#!/bin/bash
while true; do
  claude "Check if any code files changed. If yes, update corresponding tests."
  sleep 30
done
```

## 📈 Complexity-Based Test Generation

### Simple Module (< 50 lines)
- 3-5 unit tests
- 1 integration test
- Focus on happy path

### Medium Module (50-200 lines)
- 10-15 unit tests
- 3-5 integration tests
- Include edge cases

### Complex Module (> 200 lines)
- 20+ unit tests
- 5-10 integration tests
- Performance tests
- Security tests

## 🔄 Self-Improving Test Framework

### Track Test Effectiveness
```javascript
// Add to test files
afterEach(function() {
  if (this.currentTest.state === 'failed') {
    // Log failed test patterns
    logTestFailure({
      test: this.currentTest.title,
      error: this.currentTest.err,
      timestamp: new Date()
    });
  }
});
```

### Claude Code Learning Prompt
```bash
claude "Analyze test failure patterns in @test-failures.log and suggest:
1. Common failure causes
2. Test improvements
3. Code patterns to avoid"
```

## 🎯 Success Metrics

Track these metrics to ensure TDD is working:

1. **Bug Discovery Rate** - Bugs found in testing vs production
2. **Development Velocity** - Features completed per sprint
3. **Code Coverage** - Target 80%+
4. **Test Execution Time** - Keep under 5 minutes
5. **Refactoring Confidence** - How often you refactor

## 🚀 Next Steps

1. Start with one feature using full TDD
2. Measure the results
3. Adjust the framework based on what works
4. Share patterns with team

Remember: The goal is not 100% coverage, but 100% confidence in your code.
