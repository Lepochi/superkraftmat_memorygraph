# Contributing to Superkraftmat Memory System

First off, thank you for considering contributing to the Superkraftmat Memory System! 🎉

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- Git
- Claude Desktop (for testing MCP integration)
- SQLite3 (v2.0 uses SQLite for performance and scalability)
- TypeScript 5.x (custom MCP server in TypeScript)

### Setting Up Your Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/superkraft_memory.git
   cd superkraft_memory
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Load Project Context**
   ```bash
   # If using Claude Code
   claude "Read @docs/context/PROJECT_CONTEXT.md"
   claude "Read @docs/context/CODING_STANDARDS.md"
   claude "Read @docs/context/CURRENT_STATE.md"
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When reporting bugs, include:**
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues.

**When suggesting enhancements, include:**
- Clear, descriptive title
- Step-by-step description of the enhancement
- Explanation of why this would be useful
- Possible implementation approach

### Pull Requests

1. **Check existing issues** first
2. **Create an issue** if none exists
3. **Fork the repository**
4. **Create your feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
5. **Follow coding standards** (see `docs/context/CODING_STANDARDS.md`)
6. **Write/update tests**
7. **Update documentation**
8. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
9. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
10. **Open a Pull Request**

## 🎨 Style Guidelines

### Git Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Code style changes (formatting, missing semicolons, etc.)
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvement
- `test:` Adding missing tests
- `chore:` Changes to build process or auxiliary tools

Examples:
```bash
feat: add entity search functionality
fix: resolve memory leak in context loading
docs: update API documentation for v2 endpoints
```

### JavaScript Style

See `docs/context/CODING_STANDARDS.md` for detailed guidelines.

Key points:
- Use ES6+ features
- Async/await over promises
- Meaningful variable names
- Comment complex logic

### Testing

- Write tests for new features
- Maintain 80%+ code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

## 🔄 Development Workflow

### For Simple Changes

1. Create issue
2. Make changes
3. Test locally
4. Submit PR

### For Complex Features

1. **Discuss first** - Create an issue for discussion
2. **Design document** - For major changes, write a design doc
3. **Prototype** - Create proof of concept if needed
4. **Implement** - Follow TDD approach
5. **Review** - Request review from maintainers

### Using Claude Code

If you're using Claude Code for development:

```bash
# Analyze before making changes
claude /analyze

# Generate tests for your feature
claude /test "Create tests for [your feature]"

# Check code quality
claude /refactor "Review [your file] for improvements"
```

## 📋 Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code follows project style guidelines
- [ ] Tests pass (`npm test`)
- [ ] Coverage maintained at 80%+
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Branch is up-to-date with main
- [ ] No console.log statements
- [ ] Memory system still works with Claude Desktop

## 🎯 Areas We Need Help

### High Priority
- SQLite migration implementation (Phase 2)
- Custom MCP server development (Phase 3)
- Performance optimization for 100K+ entities
- Additional test coverage for v2.0 features

### Good First Issues
Look for issues tagged with `good first issue` - these are perfect for newcomers!

### Feature Requests
Check issues tagged with `enhancement` for feature ideas.

## 💬 Communication

### Questions?
- Create an issue with the `question` tag
- Email: leonard@superkraftmat.no

### Stay Updated
- Watch the repository for updates
- Check CURRENT_STATE.md for project status

## 🏆 Recognition

Contributors will be:
- Listed in our README
- Mentioned in release notes
- Given credit in commit messages

## 📚 Additional Resources

- [Project Context](docs/context/PROJECT_CONTEXT.md)
- [Coding Standards](docs/context/CODING_STANDARDS.md)
- [Current State](docs/context/CURRENT_STATE.md)
- [Architecture Overview](docs/architecture/README.md)

Thank you for contributing to make the Superkraftmat Memory System better! 🚀

---

*Last updated: May 29, 2025*
