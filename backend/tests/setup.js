// Test setup file
process.env.NODE_ENV = 'test';
process.env.MEMORY_FILE_PATH = '/test/memory.jsonl';

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