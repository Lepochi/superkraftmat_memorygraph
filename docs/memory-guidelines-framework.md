# Memory Guidelines Framework v2.0

## Overview

This framework provides a structured approach to AI memory management, specifically designed to eliminate context window waste and repetitive explanations. Version 2.0 enhances the original framework with SQLite-powered intelligence, importance scoring, and temporal decay algorithms. It implements a three-tiered information architecture that automatically prioritizes the most relevant information while maintaining comprehensive business context.

**Current Implementation Status (June 2025)**: Production system operational with dual-backend architecture: Railway frontend deployment connecting to Supabase PostgreSQL database (35 entities, 36 relations). Smart API switching between environments with direct REST API integration.

## Problem Statement

The primary challenge in AI-assisted business operations is constantly reiterating unprecise prompts that lead to:
- Context window waste
- Time loss from repetitive explanations
- Inefficient AI interactions
- Loss of conversation momentum

## Research Foundation

This framework is built on established AI memory management principles:
- **Selective Retrieval**: Extract only the most salient facts to minimize token consumption
- **Two-Phase Pipeline**: Extraction and Update phases for optimal memory management
- **Hybrid Architecture**: Combining semantic search with graph relationships
- **Profile-Based Approach**: Unified context rather than scattered memory fragments
- **80/20 Rule**: Focus on the 20% of information used 80% of the time

## Framework Architecture

### TIER 1: System Architecture & Infrastructure
**Always Retrieved** - Core technical context for development continuity

#### Current Production Status (June 2, 2025)
- **Frontend**: Railway deployment with Supabase integration ✅ OPERATIONAL
- **Backend**: Dual architecture (Railway SQLite + Supabase PostgreSQL)
- **Data**: 35 entities, 36 relations, direct REST API connectivity
- **Critical Issue**: Railway MCP tools non-functional, CLI API integration required

#### Core Technical Stack
- **Frontend**: Vite + Vanilla JS with Canvas visualization
- **Backend**: Node.js + Express with SQLite/PostgreSQL support  
- **MCP Server**: TypeScript with hybrid 3-backend architecture
- **Deployment**: Railway frontend + Supabase database integration

#### API Architecture
- **Production**: Direct Supabase REST API with auto-detection
- **Development**: Railway backend with SQLite storage
- **Smart Switching**: Environment-aware API selection
- **Authentication**: Supabase anon key for public operations

#### Critical URLs & Endpoints
- **Production Frontend**: `https://superkraftmatmemorygraph-production-493c.up.railway.app`
- **Supabase Database**: `https://xthjwtxmlmnwcwvqfiai.supabase.co`
- **Railway CLI API**: `https://docs.railway.com/reference/cli-api` (integration needed)

### TIER 2: Development Priorities & Progress
**Context-Sensitive Retrieval** - Current development context and next steps

#### Current Session Status (June 2, 2025)
- **RESOLVED**: Frontend-Supabase connectivity with 35 entities operational
- **HIGH PRIORITY**: Railway CLI API integration (MCP tools broken)
- **NEXT**: Performance optimization for 10K+ entities
- **FUTURE**: Enterprise features and multi-user collaboration

#### Recent Implementations (Session Completed)
- **Supabase API Client**: Direct REST API integration (`frontend/src/api/supabaseApi.js`)
- **Smart API Detection**: Environment-aware switching (`frontend/src/app.js`)
- **Visual Indicators**: Backend status display (🗄️ Supabase vs 🚂 Railway)
- **Production Validation**: 35 entities + 36 relations successfully loading

#### Next Session Priorities
- **Railway CLI API**: Replace non-functional MCP tools with direct API integration
- **Performance Testing**: Load testing with 10K+ entities and concurrent users
- **Caching Layer**: Implement intelligent embedding cache for sub-millisecond searches
- **Enterprise Features**: Multi-user collaboration and advanced security

### TIER 3: Operational Context
**On-Demand Retrieval** - Detailed information loaded when specifically needed

#### Supplier Stories
- Farm backgrounds and philosophies
- Sourcing relationships and history
- Quality standards and certifications
- Sustainability practices and values

#### Technical Specifications
- Detailed product ingredients and properties
- Nutritional information and allergens
- Production processes and requirements
- Equipment specifications and capabilities

#### Process Knowledge
- Production optimization insights
- Quality control procedures
- Inventory management systems
- Operational best practices

## Intelligence Features

### Pattern Detection
- Automatically detects when significant business changes occur
- Prompts for context updates when patterns suggest new information
- Identifies when project status may have changed

### Context Inheritance
- Every conversation starts with relevant Tier 1 information
- Dynamically loads applicable Tier 2 context based on conversation topic
- Maintains conversation continuity across sessions

### Selective Loading
- Only retrieves Tier 3 information when conversation requires it
- Prevents information overload and context window waste
- Optimizes response time and relevance

## Implementation Guidelines

### Information Categorization
When adding new information to memory, categorize using these criteria:

**Tier 1 Criteria:**
- Used in 80% or more of conversations
- Fundamental to business understanding
- Changes infrequently (monthly or less)
- Critical for context in all business areas

**Tier 2 Criteria:**
- Project-specific information
- Changes regularly (weekly to monthly)
- Needed for work continuity
- Affects multiple business areas

**Tier 3 Criteria:**
- Specialized or detailed information
- Used occasionally or for specific tasks
- Technical or operational details
- Can be retrieved when needed

### Update Frequency
- **Tier 1**: Monthly reviews or when major changes occur
- **Tier 2**: Weekly updates or project milestone changes
- **Tier 3**: As-needed updates when information changes

### Quality Control
- Prioritize accuracy over completeness
- Maintain consistent formatting and structure
- Regular review and cleanup of outdated information
- Validation of information sources and currency

## Expected Outcomes

### Efficiency Gains
- Reduced context setup time per conversation
- Faster AI response times through optimized memory retrieval
- Fewer repetitive explanations needed
- Improved conversation flow and productivity

### Quality Improvements
- More relevant and contextual AI responses
- Better understanding of business nuances
- Consistent information across all interactions
- Enhanced decision-making support

### Scalability Benefits
- Framework grows with business complexity
- Easily adaptable to new business areas
- Maintainable information architecture
- Future-proof memory management approach

## Maintenance and Evolution

### Regular Reviews
- Monthly Tier 1 context validation
- Quarterly framework effectiveness assessment
- Annual structure and categorization review
- Continuous optimization based on usage patterns

### Adaptation Strategies
- Monitor conversation patterns for new information needs
- Adjust tier classifications based on actual usage
- Incorporate new business areas as they develop
- Refine intelligence features based on effectiveness

## Success Metrics

### Efficiency Metrics
- Reduction in context setup time per conversation
- Decrease in repetitive explanations needed
- Improved AI response relevance scores
- Faster time to productive conversation

### Quality Metrics
- Accuracy of AI responses using stored context
- Completeness of business understanding in responses
- User satisfaction with AI interaction quality
- Reduction in clarification requests needed

---

*This framework represents a research-backed approach to AI memory management, specifically designed for complex business operations requiring comprehensive context while optimizing for efficiency and relevance.*