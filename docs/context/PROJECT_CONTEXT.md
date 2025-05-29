# Superkraftmat Memory System Context

## 🎯 Business Purpose

### Problem We're Solving
The Superkraftmat Memory System addresses the critical challenge of context loss in AI-assisted development. Every new chat session with Claude requires re-explaining project context, leading to:
- Wasted time on repetitive explanations
- Inconsistent responses due to missing context
- Friction in the development workflow

### Solution
A persistent knowledge graph that maintains:
- Business intelligence (company goals, products, relationships)
- Project momentum (current work, blockers, progress)
- Operational context (technical details, procedures)

### Key Users
1. **Primary**: Superkraftmat (Leonard) - Solo developer/founder
2. **Future**: Development team members
3. **Indirect**: Claude and other AI assistants

## 📊 Business Requirements

### Core Capabilities
1. **Context Persistence**: Maintain knowledge across chat sessions
2. **Intelligent Retrieval**: Load relevant context based on current task
3. **Pattern Learning**: Improve based on usage patterns
4. **Team Scalability**: Support multiple users (future)

### Success Metrics
- 80% reduction in context explanation time
- Zero critical context loss between sessions
- Seamless integration with Claude Desktop
- Sub-second context retrieval

## 🏗️ Technical Overview

### Architecture Pattern
**Three-Tier Intelligent System**:
1. **Data Layer**: JSONL-based knowledge graph
2. **API Layer**: Express.js REST API with MCP integration
3. **UI Layer**: Vanilla JavaScript with Apple-inspired design

### Technology Choices
- **Node.js**: Consistency across stack, Claude Code familiarity
- **JSONL Storage**: Simple, version-controllable, human-readable
- **MCP Protocol**: Direct integration with Claude Desktop
- **Vanilla JS**: No framework overhead, maximum flexibility

### Performance Requirements
- Context loading: < 100ms
- API response time: < 50ms
- Memory file size: Optimized for < 10MB
- Concurrent users: Support 5+ (future)

## 🧠 Domain Knowledge

### Core Concepts

#### Entities
- **Definition**: Named objects in the knowledge graph
- **Types**: Person, Company, Project, System, etc.
- **Properties**: name, entityType, observations[]

#### Relations
- **Definition**: Connections between entities
- **Structure**: from -> relationType -> to
- **Examples**: "implements", "uses", "manages"

#### Observations
- **Definition**: Facts or notes about an entity
- **Purpose**: Store evolving knowledge
- **Format**: Array of strings, timestamped internally

#### Framework Tiers
1. **Tier 1 - Business Intelligence**: Always loaded
2. **Tier 2 - Project Momentum**: Contextually loaded
3. **Tier 3 - Operational Context**: On-demand

### Business Rules
1. **Entity Names**: Must be unique across the graph
2. **Relations**: Must reference existing entities
3. **Observations**: Append-only (no editing history)
4. **Context Loading**: Based on relevance scoring

### Terminology Glossary
- **MCP**: Model Context Protocol (Claude Desktop integration)
- **Knowledge Graph**: Network of entities and relationships
- **Context Window**: Available tokens for AI processing
- **Beast Mode**: Highly optimized Claude Code workflow
- **Tiered Retrieval**: Intelligent context loading system

## 🔄 Integration Points

### Claude Desktop
- Configuration via `claude_desktop_config.json`
- MCP server at `~/superkraft_memory/mcp-server`
- Filesystem access to `.claude/` directory

### Development Workflow
1. Claude reads context from this system
2. Developer updates knowledge during work
3. System learns patterns from usage
4. Next session starts with optimized context

## 📈 Future Vision

### Phase 1 (Current)
- Single-user memory system
- Manual context updates
- Basic pattern recognition

### Phase 2 (Next)
- Team collaboration features
- Automatic context extraction
- Advanced pattern learning

### Phase 3 (Future)
- Multi-model support (GPT, Gemini, etc.)
- Enterprise deployment
- API marketplace for memory plugins

---

*Last Updated: May 29, 2025*
*Primary Contact: leonard@superkraftmat.no*
