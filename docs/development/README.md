# Development Guide

## 🛠️ Development Environment Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Git
- SQLite3 (v2.0 requirement)
- TypeScript (v5.x for MCP server development)
- Docker (optional, for containerized development)

### Initial Setup

1. **Clone and navigate to the repository:**
   ```bash
   git clone <repository-url>
   cd superkraft_memory
   ```

2. **Install dependencies:**
   ```bash
   npm run setup
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your specific configuration
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

This will start both frontend (port 5173) and backend (port 8000) servers.

## 📁 Project Structure Explained

### Frontend (`/frontend`)
- **Vanilla JavaScript** for simplicity and performance
- **Modular CSS** with design system variables
- **Component-based architecture** (without frameworks)
- **Build system** with bundling and optimization

### Backend (`/backend`)
- **Express.js** REST API server
- **MCP integration** for Claude Desktop
- **Memory management** (v1.0: JSONL, v2.0: SQLite)
- **WebSocket support** for real-time updates
- **v2.0**: SQLite service layer with connection pooling

### Memory (`/memory`)
- **v1.0**: JSONL-based storage for knowledge graph
- **v2.0**: SQLite database with FTS5 search
- **Schema validation** for data integrity
- **Backup system** (JSONL copies → SQLite backups)
- **Migration scripts** for v1.0 → v2.0 transition

### MCP Server (`/mcp-server`) - v2.0
- **TypeScript** implementation
- **Direct SQLite** integration
- **Optimized** for 100K+ entities
- **Claude Desktop** compatible

## 🔧 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test locally
npm run dev

# Run tests
npm test

# Lint code
npm run lint:fix

# Commit changes
git add .
git commit -m "feat: add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### 2. Code Quality
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **Jest** for testing

### 3. Docker Development
```bash
# Start development environment
npm run docker:dev

# Stop environment
npm run docker:down
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:backend
npm run test:frontend

# Run tests in watch mode
npm run test:watch

# v2.0: Test SQLite migrations
npm run test:migration

# v2.0: Test MCP server
npm run test:mcp
```

### Test Structure
- **Unit tests**: Individual function testing
- **Integration tests**: API endpoint testing
- **E2E tests**: Full workflow testing

## 📊 Monitoring & Debugging

### Logging
- **Development**: Console logs with colors
- **Production**: File-based logging with rotation
- **Error tracking**: Structured error reporting

### Performance
- **Frontend**: Lighthouse audits
- **Backend**: Request timing and memory usage
- **Memory system**: 
  - v1.0: JSONL file access patterns
  - v2.0: SQLite query performance, index usage
- **v2.0 Targets**: 
  - Handle 100K+ entities
  - Sub-100ms search queries
  - Efficient context retrieval

## 🚀 Deployment

### Development Deployment
```bash
npm run build
npm start
```

### Production Deployment
See [Enterprise Guide](enterprise.md) for production deployment instructions.

## 🔐 Security Considerations

- **Environment variables** for sensitive data
- **API rate limiting** to prevent abuse
- **Input validation** on all endpoints
- **CORS configuration** for cross-origin requests

## 🤝 Team Collaboration

### Code Review Process
1. Create feature branch
2. Implement changes with tests
3. Open Pull Request
4. Code review by team member
5. Address feedback
6. Merge to main branch

### Branch Naming Convention
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

## 📚 Resources

- [Frontend Architecture](frontend-architecture.md)
- [Backend Architecture](backend-architecture.md)
- [Memory System Design](memory-system.md)
- [API Documentation](../api/README.md)

## 🆘 Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in `.env` file
2. **Memory file locked**: Restart development server
3. **Dependencies out of sync**: Run `npm run setup` again
4. **v2.0: SQLite locked**: Check for hanging connections
5. **v2.0: Migration fails**: Validate JSONL format first
6. **v2.0: MCP server issues**: Check TypeScript compilation

### Getting Help
- Check existing issues on GitHub
- Create new issue with detailed description
- Contact: leonard@superkraftmat.no