# API Migration Analysis: Frontend v1 to v2

## Overview
This document analyzes the current frontend implementation and outlines the required changes to migrate from API v1 to API v2 (SQLite-based).

## Current Frontend API Usage (v1)

### 1. API Client (`/frontend/src/api/memoryApi.js`)
The current API client uses the following endpoints:

#### Base Configuration
- **Base URL**: `http://localhost:8000/api`
- **Timeout**: 5 seconds
- **CORS**: Enabled

#### Current v1 Endpoints Used
1. **GET /api/memory** - Fetch all memory data
2. **POST /api/memory/entities** - Create entities
3. **DELETE /api/memory/entities/:name** - Delete entity by name
4. **POST /api/memory/relations** - Create relations
5. **GET /api/health** - Health check

### 2. Data Flow and Transformations

#### Data Format (v1)
```javascript
// Input format from API
{
  entities: [
    {
      name: "John Doe",
      entityType: "person",
      observations: ["Works at Google", "Lives in SF"]
    }
  ],
  relations: [
    {
      from: "John Doe",
      to: "Google",
      relationType: "works_at"
    }
  ]
}
```

#### Frontend Data Usage
1. **Canvas.js** - Renders entities as draggable nodes with connections
2. **app.js** - Main UI controller that:
   - Loads data on initialization
   - Manages entity CRUD operations
   - Handles search and filtering
   - Manages UI state (selected entity, filters, etc.)

### 3. Key Frontend Features Using API
1. **Entity Management**
   - Create new entities with name, type, and observations
   - Delete entities (cascades to relations)
   - Display entity details in side panel
   
2. **Relation Management**
   - Implicit creation through UI (not yet implemented)
   - Display connections in graph
   - Show relations in entity details

3. **Search and Filter**
   - Client-side search through entities and observations
   - Filter by entity type (person, company, project, system, other)

4. **Error Handling**
   - Network timeout detection
   - Offline mode fallback
   - User notifications for all operations

## Required Changes for v2 Migration

### 1. API Endpoint Updates

#### Replace v1 Endpoints with v2
```javascript
// Old endpoints → New endpoints
GET /api/memory → GET /api/v2/memory/entities + GET /api/v2/memory/relations
POST /api/memory/entities → POST /api/v2/memory/entities  
DELETE /api/memory/entities/:name → DELETE /api/v2/memory/entities/:id
POST /api/memory/relations → POST /api/v2/memory/relations
```

### 2. Data Format Changes

#### v2 Entity Format
```javascript
// v2 Response format
{
  entities: [
    {
      id: 1,
      name: "John Doe",
      type: "person", // Note: 'type' not 'entityType'
      metadata: {
        description: "Software Engineer"
      },
      importance_score: 85,
      created_at: 1717123200,
      updated_at: 1717123200,
      last_accessed: 1717123200,
      access_count: 5,
      _stats: {
        relations: 3,
        observations: 2
      }
    }
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 100,
    totalPages: 2
  }
}
```

#### v2 Relation Format
```javascript
{
  relations: [
    {
      id: 1,
      source_id: 1,
      target_id: 2,
      type: "works_at",
      strength: 50,
      metadata: {},
      from_name: "John Doe",
      from_type: "person",
      to_name: "Google",
      to_type: "company"
    }
  ]
}
```

### 3. Key API Changes

#### Entity Operations
1. **Identification**: Entities now use numeric `id` instead of `name`
2. **Type field**: `entityType` → `type`
3. **Observations**: Separate endpoint `/api/v2/memory/entities/:id/observations`
4. **Metadata**: Additional fields like importance_score, timestamps, access tracking
5. **Pagination**: All list endpoints support pagination

#### Relation Operations
1. **ID-based**: Relations use `source_id` and `target_id` instead of names
2. **Strength**: New `strength` field for relation weight
3. **Metadata**: Support for relation metadata

#### New Features in v2
1. **Search strategies**: exact, prefix, fuzzy
2. **Advanced filtering**: By type, metadata, importance
3. **Statistics endpoint**: `/api/v2/memory/stats`
4. **Related entities**: `/api/v2/memory/entities/:id/related`

### 4. Frontend Code Changes Required

#### memoryApi.js Updates
1. Update base URL to include version
2. Modify data transformation logic
3. Add pagination support
4. Update entity/relation creation payloads
5. Change delete to use ID instead of name
6. Add new methods for observations and related entities

#### app.js Updates
1. Handle paginated responses
2. Map entity IDs for operations
3. Update entity type field references
4. Separate observation management
5. Update relation creation to use IDs

#### Canvas.js Updates
1. Use entity ID as identifier instead of name
2. Update connection logic to use IDs
3. Handle additional metadata fields

### 5. Migration Strategy

#### Phase 1: Dual Support
1. Create v2 API client alongside v1
2. Add version toggle in UI
3. Test both versions side-by-side

#### Phase 2: Gradual Migration
1. Update read operations first
2. Migrate write operations
3. Add v2-specific features

#### Phase 3: Deprecate v1
1. Remove v1 client code
2. Clean up data transformations
3. Optimize for v2 performance

### 6. Backwards Compatibility Considerations
1. **Entity identification**: Need mapping between names and IDs
2. **Data format**: Transform v2 responses to v1 format initially
3. **Feature flags**: Use environment variables to toggle versions

### 7. Testing Requirements
1. Unit tests for new API client methods
2. Integration tests for data transformations
3. E2E tests for critical user workflows
4. Performance benchmarks comparing v1 vs v2

## Implementation Checklist

- [ ] Create new v2 API client module
- [ ] Add data transformation utilities
- [ ] Update entity CRUD operations
- [ ] Update relation management
- [ ] Add pagination UI components
- [ ] Implement observation management
- [ ] Add search strategy selector
- [ ] Update error handling for v2 errors
- [ ] Add loading states for paginated data
- [ ] Create migration toggle in settings
- [ ] Write comprehensive tests
- [ ] Update documentation
- [ ] Create migration guide for users

## Performance Improvements Expected
1. **Query Speed**: 100-500ms → <10ms
2. **Data Capacity**: 1,000 entities → 100,000+ entities
3. **Search Performance**: Client-side → Server-side with indexing
4. **Memory Usage**: Load all data → Paginated loading

## Risk Mitigation
1. **Data Loss**: Implement thorough testing before migration
2. **User Disruption**: Provide toggle between versions
3. **Performance Regression**: Benchmark all operations
4. **Feature Parity**: Ensure all v1 features work in v2