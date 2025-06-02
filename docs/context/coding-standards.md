# Superkraftmat Memory System - Coding Standards v2.0

## 🎨 Code Style Guide

### JavaScript Standards (Frontend/Backend)

#### Naming Conventions
```javascript
// Files: kebab-case
memory-controller.js
framework-engine.js

// Classes: PascalCase
class MemoryController {}
class FrameworkEngine {}

// Functions/Methods: camelCase
function loadContext() {}
async function saveEntity() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;

// Private methods: underscore prefix
_validateEntity() {}
_internalProcess() {}
```

#### Code Organization
```javascript
// Standard module structure
// 1. Imports
import { readFile } from 'fs/promises';

// 2. Constants
const CONFIG_PATH = './config.json';

// 3. Class/Main functionality
class MemoryManager {
  constructor() {
    // Initialize
  }
  
  // Public methods first
  async loadMemory() {}
  
  // Private methods last
  _processData() {}
}

// 4. Exports
export default MemoryManager;
```

### File Organization
```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── models/          # Data structures
├── utils/           # Helper functions
├── middleware/      # Express middleware
└── config/          # Configuration files
```

## 💡 Design Patterns

### Preferred Patterns

#### 1. **Module Pattern** (For Services)
```javascript
// services/memory-service.js
const MemoryService = (() => {
  // Private variables
  let memoryCache = null;
  
  // Private methods
  function validateMemory(data) {
    // Validation logic
  }
  
  // Public API
  return {
    async load() {
      // Implementation
    },
    
    async save(data) {
      // Implementation
    }
  };
})();

export default MemoryService;
```

#### 2. **Factory Pattern** (For Object Creation)
```javascript
// factories/entity-factory.js
class EntityFactory {
  static create(type, data) {
    switch(type) {
      case 'person':
        return new PersonEntity(data);
      case 'project':
        return new ProjectEntity(data);
      default:
        return new GenericEntity(data);
    }
  }
}
```

#### 3. **Observer Pattern** (For Event Handling)
```javascript
// Event-driven updates
memoryService.on('entityUpdated', (entity) => {
  frameworkEngine.updateContext(entity);
});
```

## 🛡️ Error Handling

### Standard Approach
```javascript
// Always use try-catch for async operations
async function riskyOperation() {
  try {
    const result = await someAsyncCall();
    return { success: true, data: result };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in riskyOperation:`, error);
    
    // Return structured error
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

### Error Classes
```javascript
// Custom error classes for different scenarios
class MemoryError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MemoryError';
    this.code = code;
  }
}

class ValidationError extends MemoryError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR');
  }
}
```

## 🧪 Testing Requirements

### Test Structure
```javascript
// Test files mirror source structure
// src/services/memory-service.js → tests/services/memory-service.test.js

describe('MemoryService', () => {
  // Setup
  beforeEach(() => {
    // Reset state
  });
  
  describe('load()', () => {
    it('should load memory from file', async () => {
      // Arrange
      const mockData = { entities: [] };
      
      // Act
      const result = await MemoryService.load();
      
      // Assert
      expect(result).toEqual(mockData);
    });
    
    it('should handle file not found', async () => {
      // Test error scenarios
    });
  });
});
```

### Coverage Requirements
- **Target**: 80% overall coverage
- **Critical paths**: 100% coverage
- **UI Components**: 60% minimum
- **Utilities**: 90% coverage

## 📝 Documentation Standards

### Function Documentation
```javascript
/**
 * Loads context based on the current query and user patterns
 * @param {string} query - The current user query
 * @param {Object} options - Loading options
 * @param {boolean} options.includeTier3 - Whether to include operational context
 * @returns {Promise<Object>} The loaded context object
 * @throws {MemoryError} If memory file is corrupted
 */
async function loadContext(query, options = {}) {
  // Implementation
}
```

### Code Comments
```javascript
// Use comments to explain WHY, not WHAT
// ❌ Bad: Increment counter
counter++;

// ✅ Good: Track retry attempts for exponential backoff
counter++;

// Complex logic requires explanation
// The framework engine uses a three-pass approach:
// 1. Pattern detection - identify query type
// 2. Context gathering - collect relevant entities
// 3. Optimization - minimize token usage
```

## 🚀 Performance Guidelines

### Optimization Rules
1. **Lazy Loading**: Load data only when needed
2. **Caching**: Cache frequently accessed data
3. **Batch Operations**: Group multiple operations
4. **Async First**: Use async/await for I/O operations

```javascript
// Example: Efficient batch processing
async function processEntities(entities) {
  // Process in chunks to avoid memory overload
  const CHUNK_SIZE = 100;
  const results = [];
  
  for (let i = 0; i < entities.length; i += CHUNK_SIZE) {
    const chunk = entities.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(entity => processEntity(entity))
    );
    results.push(...chunkResults);
  }
  
  return results;
}
```

## 🔒 Security Practices

### Input Validation
```javascript
// Always validate and sanitize inputs
function validateEntityName(name) {
  if (typeof name !== 'string') {
    throw new ValidationError('Entity name must be a string');
  }
  
  if (name.length < 1 || name.length > 255) {
    throw new ValidationError('Entity name must be 1-255 characters');
  }
  
  // Sanitize
  return name.trim().replace(/[<>]/g, '');
}
```

### Safe Defaults
```javascript
// Use safe defaults for configurations
const config = {
  timeout: process.env.TIMEOUT || 5000,
  maxRetries: process.env.MAX_RETRIES || 3,
  enableDebug: process.env.DEBUG === 'true' // Explicit check
};
```

## 🏗️ Project-Specific Conventions

### Memory System Specifics
1. **Entity IDs**: Use timestamp-based IDs for uniqueness
2. **Observations**: Always append, never modify
3. **Relations**: Validate both entities exist
4. **Context**: Respect tier boundaries

### Framework Integration
```javascript
// Standard pattern for framework components
class FrameworkComponent {
  constructor(config) {
    this.config = this._validateConfig(config);
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) return;
    // Initialization logic
    this.initialized = true;
  }
  
  async process(input) {
    if (!this.initialized) {
      throw new Error('Component not initialized');
    }
    // Processing logic
  }
}
```

## 📋 Code Review Checklist

Before submitting code:
- [ ] Follows naming conventions
- [ ] Includes error handling
- [ ] Has appropriate comments
- [ ] Includes tests (80% coverage)
- [ ] Documentation updated
- [ ] No console.log in production code
- [ ] Security considerations addressed
- [ ] Performance impact considered

---

### TypeScript Standards (MCP Server)

#### Type Definitions
```typescript
// Interfaces: Prefix with 'I' for clarity
interface IMemoryEntity {
  id: number;
  name: string;
  type: EntityType;
  metadata?: Record<string, unknown>;
}

// Types: PascalCase, descriptive
type EntityType = 'person' | 'company' | 'project' | 'system' | 'other';
type ImportanceScore = number; // 0-100

// Enums: PascalCase, singular
enum MemoryTier {
  Critical = 1,
  Active = 2,
  Archive = 3
}
```

#### Function Signatures
```typescript
// Always type parameters and return values
function calculateImportance(entity: IMemoryEntity): ImportanceScore {
  return entity.metadata?.importance || 50;
}

// Async functions with Promise types
async function loadEntity(id: number): Promise<IMemoryEntity> {
  const entity = await db.get('entities', id);
  return entity;
}

// Optional parameters last
function searchMemories(
  query: string,
  options?: ISearchOptions
): IMemoryEntity[] {
  // Implementation
}
```

#### Class Structure
```typescript
// Use access modifiers explicitly
class MemoryService {
  private readonly db: Database;
  private cache: Map<number, IMemoryEntity>;
  
  constructor(private config: IServiceConfig) {
    this.db = new Database(config.dbPath);
    this.cache = new Map();
  }
  
  public async getMemory(id: number): Promise<IMemoryEntity> {
    // Public API
  }
  
  private validateEntity(entity: unknown): entity is IMemoryEntity {
    // Type guard
  }
}
```

#### Error Handling
```typescript
// Custom error classes with proper typing
class MemoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

// Result type for operations
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function updateEntity(
  id: number, 
  data: Partial<IMemoryEntity>
): Promise<Result<IMemoryEntity>> {
  try {
    const entity = await db.update(id, data);
    return { success: true, data: entity };
  } catch (error) {
    return { success: false, error };
  }
}
```

#### MCP Protocol Types
```typescript
// MCP-specific interfaces
interface IMCPRequest {
  method: string;
  params?: unknown;
  id: string | number;
}

interface IMCPResponse<T = unknown> {
  result?: T;
  error?: IMCPError;
  id: string | number;
}

interface IMCPError {
  code: number;
  message: string;
  data?: unknown;
}

// Type-safe handlers
type MCPHandler<P = unknown, R = unknown> = (
  params: P
) => Promise<R> | R;

const handlers: Record<string, MCPHandler> = {
  'memory/get': async (params: { id: number }) => {
    return await memoryService.getMemory(params.id);
  }
};
```

#### Best Practices
```typescript
// 1. Use strict mode
"use strict";

// 2. Avoid 'any' - use 'unknown' and type guards
function processData(data: unknown): void {
  if (isMemoryEntity(data)) {
    // Safe to use as IMemoryEntity
  }
}

// 3. Prefer const assertions
const CONFIG = {
  maxRetries: 3,
  timeout: 5000
} as const;

// 4. Use utility types
type PartialEntity = Partial<IMemoryEntity>;
type ReadonlyEntity = Readonly<IMemoryEntity>;
type EntityKeys = keyof IMemoryEntity;

// 5. Document complex types
/**
 * Represents a memory with calculated importance score
 * @property score - Calculated 0-100 based on access patterns
 * @property decay - Temporal decay factor applied
 */
interface IScoredMemory extends IMemoryEntity {
  score: ImportanceScore;
  decay: number;
}
```

---

*These standards are enforced by ESLint/TSLint configuration and reviewed in PR process*
*Last Updated: May 29, 2025*
*Version: 2.0*
