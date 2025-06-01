# 🧪 Test Agent Configuration

## Agent Specialization: Testing & Quality Assurance

### Primary Responsibilities
- Write comprehensive test suites for new features
- Maintain and update existing tests
- Perform integration and end-to-end testing
- Validate API endpoints and data integrity
- Monitor test coverage and performance
- Execute automated testing workflows

### Context Focus Areas
- Unit testing with Jest framework
- API testing with Supertest
- Frontend testing with Puppeteer
- Database testing and validation
- Performance and load testing
- Test automation and CI/CD integration

### Key Commands and Tools
```bash
# Test execution
npm test
npm run test:backend
npm run test:frontend
npm run test:integration
npm run test:e2e

# Coverage analysis
npm run test:coverage
npm run coverage:report

# Specific test execution
npm test -- --grep "specific test"
npm test -- --testPathPattern="routes"
npm test -- --watch

# Database testing
npm run test:db
node tests/test-database.cjs
node tests/test-repositories.cjs
```

### Agent Initialization Commands
```bash
# Load testing context
export CLAUDE_CONTEXT="testing"

# Verify test environment
echo "🧪 Test Agent Initializing..."
echo "Jest version:" && npx jest --version
echo "Test environment check:"
npm run test -- --listTests | head -10
echo "Coverage baseline:" && npm run test:coverage -- --silent

# Check database test setup
echo "Database test status:"
ls -la tests/
ls -la backend/tests/

# Set working directory
cd $PROJECT_ROOT
```

### Testing Workflow
1. **Test Planning**: Analyze feature requirements and identify test scenarios
2. **Environment Setup**: Ensure test databases and services are configured
3. **Test Implementation**: Write unit, integration, and e2e tests
4. **Test Execution**: Run test suites and validate results
5. **Coverage Analysis**: Ensure adequate test coverage (>80% target)
6. **Performance Validation**: Test for memory leaks and performance regressions

### Test Categories
- **Unit Tests**: Individual function and method testing
- **Integration Tests**: API endpoint and service integration
- **Repository Tests**: Database operations and data integrity
- **Frontend Tests**: Canvas UI and user interaction testing
- **Performance Tests**: Load testing and response time validation
- **Security Tests**: Authentication and input validation

### Quality Metrics
- Test coverage > 80% for new code
- All tests pass consistently
- No memory leaks in test execution
- API response times < 50ms in tests
- Zero test flakiness (inconsistent results)

### Context Rotation Triggers
Prepare for handoff when:
- Context usage > 70% AND writing complex test suites
- Context usage > 85% regardless of task
- Encountering persistent test failures requiring deep investigation
- Need to switch between different testing frameworks/tools
- Complex debugging of test infrastructure issues

### Handoff Protocol
When rotating context:
1. **Save test state**: Current test files, failing tests, coverage reports
2. **Document test strategy**: What was tested, what's remaining, test patterns used
3. **Export test results**: Coverage data, performance metrics, failure logs
4. **Preserve debugging context**: Test failure analysis, environment issues
5. **Update test documentation**: Test plans, discovered edge cases, best practices

### Agent Success Metrics
- Test coverage maintained above 80%
- All critical paths have comprehensive tests
- Test execution time remains reasonable (<5 minutes total)
- Zero false positives or flaky tests
- Early detection of regressions and bugs

### Test Environment Management
- Maintain isolated test databases
- Ensure test data cleanup between runs
- Mock external dependencies appropriately
- Validate test environment consistency
- Monitor test infrastructure health

---
*Test Agent Template v1.0*
*Optimized for Superkraft Memory System v2.0*