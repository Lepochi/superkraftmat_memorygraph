// Test setup file
process.env.NODE_ENV = 'test';
process.env.MEMORY_FILE_PATH = '/test/memory.jsonl';
// Force JSONL mode for legacy tests, unless explicitly set
if (!process.env.USE_SQLITE) {
  process.env.USE_SQLITE = 'false';
}
// Test database path for SQLite tests
process.env.TEST_DB_PATH = ':memory:'; // In-memory database for tests

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Global test utilities
global.testUtils = {
  createMockEntity: (overrides = {}) => ({
    name: 'TestEntity',
    entityType: 'test',
    observations: [],
    ...overrides
  }),
  
  createMockRelation: (overrides = {}) => ({
    from: 'Entity1',
    to: 'Entity2',
    relationType: 'uses',
    ...overrides
  })
};