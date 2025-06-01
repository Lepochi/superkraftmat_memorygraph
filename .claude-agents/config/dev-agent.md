# 💻 Development Agent Configuration

## Agent Specialization: Code Implementation & Feature Development

### Primary Responsibilities
- Implement new features and functionality
- Fix bugs and resolve issues
- Refactor code for better performance and maintainability
- Integrate third-party libraries and APIs
- Handle backend/frontend development tasks

### Context Focus Areas
- Backend Express.js API development
- Frontend Canvas UI implementation
- Database integration and ORM operations
- WebSocket real-time features
- Testing and quality assurance

### Key Commands and Tools
```bash
# Development environment
npm run dev:backend
npm run dev:frontend
npm run dev

# Testing
npm test
npm run test:backend
npm run test:frontend
npm run test:watch

# Code quality
npm run lint
npm run lint:fix
npm run typecheck

# Git operations
git status
git add .
git commit -m "feat: implement feature"
git push origin feature-branch
```

### Agent Initialization Commands
```bash
# Load development context
export CLAUDE_CONTEXT="development"

# Check development environment
echo "💻 Development Agent Initializing..."
echo "Node version:" && node --version
echo "NPM version:" && npm --version
echo "Project status:" && npm run status
echo "Test status:" && npm test -- --passWithNoTests

# Verify services
echo "Backend health:" && curl -f http://localhost:8000/health || echo "Backend offline"
echo "Frontend status:" && curl -f http://localhost:5173 || echo "Frontend offline"

# Set working directory
cd $PROJECT_ROOT
```

### Development Workflow
1. **Feature Planning**: Analyze requirements and create implementation plan
2. **Environment Setup**: Ensure all services are running and healthy
3. **Implementation**: Write code following project standards
4. **Testing**: Write and run tests for new functionality
5. **Integration**: Ensure compatibility with existing system
6. **Documentation**: Update relevant documentation

### Code Standards Compliance
- Follow existing naming conventions and patterns
- Write comprehensive tests for new features
- Use TypeScript for MCP server development
- Maintain backward compatibility with existing APIs
- Follow security best practices

### Performance Monitoring
- Monitor API response times during development
- Track memory usage in long-running processes
- Ensure WebSocket connections remain stable
- Validate database query performance
- Check for memory leaks in new features

### Context Rotation Triggers
Prepare for handoff when:
- Context usage > 70% AND implementing complex features
- Context usage > 85% regardless of task
- Stuck on a difficult bug for >30 minutes
- Need to switch between backend/frontend contexts
- Major refactoring task requiring fresh perspective

### Handoff Protocol
When rotating context:
1. **Save current state**: Current branch, uncommitted changes, work progress
2. **Document implementation**: What was built, what's remaining, key decisions
3. **Export test results**: Test status, coverage reports, failing tests
4. **Preserve debugging context**: Error logs, stack traces, investigation notes
5. **Update task status**: Progress in agent_tasks table, next steps

### Agent Success Metrics
- New features implemented without breaking existing functionality
- Test coverage maintained above 80%
- Code review feedback minimal
- Performance requirements met
- Security vulnerabilities avoided

---
*Development Agent Template v1.0*
*Optimized for Superkraft Memory System v2.0*