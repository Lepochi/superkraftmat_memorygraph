# 📚 Documentation Structure Guide

## 📄 **File Purposes & Responsibilities**

This guide clarifies what each documentation file contains and when to update it.

### 🔥 **CLAUDE.md** - *Main Context for Claude Sessions*
**Purpose**: Primary context file for ALL Claude interactions
**Contains**: 
- Essential system overview and current status
- Critical file locations and dependencies  
- Environment variables and ports
- Implementation phase tracking with detailed checkboxes
- Quick start commands for development

**Update When**: 
- Phase completion status changes
- New critical issues discovered or resolved
- Dependencies or environment variables change
- File structure changes significantly

---

### 🗺️ **ROADMAP.md** - *High-Level Project Vision & Phases*
**Purpose**: Strategic overview and milestone tracking
**Contains**:
- Project vision and goals
- High-level phase descriptions (not detailed tasks)
- Timeline estimates and deliverables
- Feature categories and priorities

**Update When**:
- Major milestones completed
- Strategic direction changes
- New phases planned
- High-level feature priorities shift

---

### 📖 **README.md** - *User-Facing Introduction*
**Purpose**: First impression for new users and developers
**Contains**:
- Project description and key features
- Installation and setup instructions
- Basic usage examples
- Architecture overview (simplified)

**Update When**:
- Core features change
- Installation process changes
- New user onboarding flow changes

---

### 🔄 **SESSION_HANDOFF.md** - *Current Session Status*
**Purpose**: Context transfer between Claude sessions
**Contains**:
- Current session progress and discoveries
- Active debugging information
- Immediate next steps and priorities
- Recent changes and their impact

**Update When**:
- Session ends with handoff to new session
- Major discoveries or issues found
- Progress made on current tasks

---

### 📊 **CURRENT_STATE.md** - *Technical Status Snapshot*
**Purpose**: Detailed technical state for developers
**Contains**:
- Current system architecture
- Technical implementation details
- Performance metrics and benchmarks
- Active configuration details

**Update When**:
- Technical architecture changes
- Performance benchmarks updated
- Configuration changes made

---

## 🚨 **Duplicate Content Issues Identified**

### Current Problems:
1. **CLAUDE.md & ROADMAP.md**: Both contain implementation phase details
2. **Multiple files**: Similar quick start commands repeated
3. **SESSION_HANDOFF.md**: Overlaps with CLAUDE.md current status
4. **Various .md files**: Duplicate architecture descriptions

### Proposed Cleanup:
1. **CLAUDE.md**: Keep detailed phase tracking (primary source)
2. **ROADMAP.md**: Focus on high-level vision and strategy
3. **README.md**: User-focused, no implementation details
4. **Remove duplicates**: Consolidate overlapping content

---

## 🧹 **Cleanup Priorities for Phase 5.1**

### Files to Review:
- [ ] Remove duplicate content across all .md files
- [ ] Clarify each file's unique purpose
- [ ] Consolidate architecture descriptions
- [ ] Remove outdated information
- [ ] Standardize formatting and structure

### Files to Consider Removing/Merging:
- [ ] **AI_HANDOFF_PROMPT.md** - Merge relevant parts into SESSION_HANDOFF.md
- [ ] **MODIFIED_FILES_SUMMARY.md** - Archive or remove if outdated
- [ ] **Multiple test-*.html files** - Keep only essential debugging tools

### Result:
Each documentation file will have a clear, unique purpose with no overlapping content.