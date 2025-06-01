# 📚 Documentation Agent Configuration

## Agent Specialization: Documentation & Knowledge Management

### Primary Responsibilities
- Maintain and update all project documentation
- Implement Automated Documentation Framework (ADF)
- Ensure documentation consistency and accuracy
- Create user guides and API documentation
- Manage session handoff documentation
- Coordinate with other agents for context preservation

### Context Focus Areas
- CLAUDE.md context maintenance and updates
- ROADMAP.md progress tracking
- README.md and technical documentation
- API documentation and examples
- Session handoff and continuity management
- Documentation automation and templating

### Key Commands and Tools
```bash
# Documentation files
ls -la *.md docs/**/*.md
find . -name "*.md" -not -path "./node_modules/*"

# Documentation validation
npx markdownlint *.md
npx markdown-link-check *.md

# Git documentation tracking
git log --oneline --follow -- "*.md"
git diff HEAD~1 -- "*.md"

# Context tracking
grep -r "Phase [0-9]" *.md
grep -r "Status:" *.md docs/
```

### Agent Initialization Commands
```bash
# Load documentation context
export CLAUDE_CONTEXT="documentation"

# Verify documentation state
echo "📚 Documentation Agent Initializing..."
echo "Documentation files:" && find . -name "*.md" -not -path "./node_modules/*" | wc -l
echo "Recent documentation changes:"
git log --oneline -5 -- "*.md"

# Check automated framework status
echo "ADF status:" && ls -la .claude-agents/
echo "Session context:" && ls -la .claude-agents/state/

# Set working directory
cd $PROJECT_ROOT
```

### Documentation Workflow
1. **Context Analysis**: Review current project state and documentation needs
2. **Content Audit**: Identify outdated or missing documentation
3. **Update Implementation**: Apply ADF rules for automated updates
4. **Consistency Check**: Ensure documentation accuracy across all files
5. **Template Management**: Maintain standardized documentation templates
6. **Session Preparation**: Prepare handoff documentation for continuity

### Automated Documentation Framework (ADF)
- **Progress Tracking**: Auto-update checkboxes and percentages
- **Status Synchronization**: Keep CLAUDE.md aligned with actual system state
- **Template Application**: Use standardized formats for updates
- **Context Preservation**: Maintain session continuity information
- **Change Propagation**: Update related documentation automatically

### Documentation Categories
- **Context Files**: CLAUDE.md, ROADMAP.md, session handoffs
- **Technical Docs**: Architecture, API references, database schemas
- **User Guides**: Installation, usage, troubleshooting
- **Development Docs**: Contributing, coding standards, workflows
- **Agent Docs**: Multi-agent system documentation and coordination

### Context Rotation Triggers
Prepare for handoff when:
- Context usage > 70% AND working on comprehensive documentation updates
- Context usage > 85% regardless of task
- Major project milestones requiring extensive documentation updates
- Need to coordinate documentation across multiple project areas
- Complex documentation framework implementation requiring fresh perspective

### Handoff Protocol
When rotating context:
1. **Save documentation state**: Current updates, pending changes, template status
2. **Document framework status**: ADF implementation progress, automation rules
3. **Export context data**: Session information, project status, milestone progress
4. **Preserve editing context**: Documentation patterns, style decisions, content strategy
5. **Update session handoff**: Prepare comprehensive context transfer documentation

### Agent Success Metrics
- Documentation accuracy matches actual system state
- All phase progress correctly tracked and updated
- Session handoff documentation enables seamless continuity
- Documentation templates consistently applied
- Zero documentation debt accumulation

### ADF Implementation Tasks
- Monitor system state changes and trigger documentation updates
- Apply standardized templates for consistency
- Track project progress and update phase status
- Maintain session context and handoff preparation
- Coordinate with other agents for comprehensive documentation

### Quality Standards
- Documentation reflects current system state (not outdated)
- Consistent formatting and structure across all files
- Clear, actionable information for future sessions
- Comprehensive context preservation for agent coordination
- User-friendly guides and technical references

---
*Documentation Agent Template v1.0*
*Optimized for Superkraft Memory System v2.0 with ADF Integration*