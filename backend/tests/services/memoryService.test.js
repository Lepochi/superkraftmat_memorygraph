const { MemoryService } = require('../../src/services/memoryService');
const fs = require('fs').promises;
const path = require('path');
const { FileSystemError, NotFoundError, ConflictError } = require('../../src/utils/errors');

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    copyFile: jest.fn(),
    rename: jest.fn(),
    mkdir: jest.fn()
  }
}));

describe('MemoryService', () => {
  let memoryService;
  const testPath = '/test/memory.jsonl';
  
  beforeEach(() => {
    memoryService = new MemoryService(testPath);
    jest.clearAllMocks();
  });

  describe('parseJSONL', () => {
    it('should parse valid JSONL text', () => {
      const jsonl = '{"type":"entity","name":"test"}\n{"type":"relation","from":"a","to":"b"}';
      const result = memoryService.parseJSONL(jsonl);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'entity', name: 'test' });
      expect(result[1]).toEqual({ type: 'relation', from: 'a', to: 'b' });
    });

    it('should handle empty lines', () => {
      const jsonl = '{"type":"entity"}\n\n{"type":"relation"}\n';
      const result = memoryService.parseJSONL(jsonl);
      
      expect(result).toHaveLength(2);
    });

    it('should throw error for invalid JSON', () => {
      const jsonl = '{"type":"entity"}\ninvalid json\n{"type":"relation"}';
      
      expect(() => memoryService.parseJSONL(jsonl)).toThrow(FileSystemError);
    });
  });

  describe('readMemory', () => {
    it('should read and parse memory file', async () => {
      const mockData = '{"type":"entity","name":"test","entityType":"test"}\n';
      fs.readFile.mockResolvedValue(mockData);
      
      const result = await memoryService.readMemory();
      
      expect(fs.readFile).toHaveBeenCalledWith(testPath, 'utf8');
      expect(result).toEqual({
        entities: [{ name: 'test', entityType: 'test', observations: [] }],
        relations: []
      });
    });

    it('should return empty memory when file does not exist', async () => {
      const error = new Error('ENOENT');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);
      
      const result = await memoryService.readMemory();
      
      expect(result).toEqual({ entities: [], relations: [] });
    });

    it('should throw FileSystemError for other read errors', async () => {
      fs.readFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(memoryService.readMemory()).rejects.toThrow(FileSystemError);
    });
  });

  describe('writeMemory', () => {
    it('should write memory to file atomically', async () => {
      const memory = {
        entities: [{ name: 'test', entityType: 'test', observations: [] }],
        relations: []
      };
      
      await memoryService.writeMemory(memory);
      
      expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(testPath), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        `${testPath}.tmp`,
        expect.stringContaining('{"type":"entity"')
      );
      expect(fs.rename).toHaveBeenCalledWith(`${testPath}.tmp`, testPath);
    });

    it('should create backup before writing', async () => {
      const memory = { entities: [], relations: [] };
      
      await memoryService.writeMemory(memory);
      
      expect(fs.copyFile).toHaveBeenCalledWith(testPath, `${testPath}.backup`);
    });

    it('should handle backup failure gracefully', async () => {
      fs.copyFile.mockRejectedValue(new Error('Backup failed'));
      const memory = { entities: [], relations: [] };
      
      await memoryService.writeMemory(memory);
      
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('createEntities', () => {
    beforeEach(() => {
      fs.readFile.mockResolvedValue('');
    });

    it('should create new entities', async () => {
      const entities = [
        { name: 'test1', entityType: 'type1' },
        { name: 'test2', entityType: 'type2' }
      ];
      
      const result = await memoryService.createEntities(entities);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ name: 'test1', entityType: 'type1' });
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('updatedAt');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should throw ConflictError for duplicate entities', async () => {
      const existingData = '{"type":"entity","name":"existing","entityType":"test"}\n';
      fs.readFile.mockResolvedValue(existingData);
      
      const entities = [{ name: 'existing', entityType: 'test' }];
      
      await expect(memoryService.createEntities(entities)).rejects.toThrow(ConflictError);
    });
  });

  describe('createRelations', () => {
    it('should create relations between existing entities', async () => {
      const existingData = 
        '{"type":"entity","name":"entity1","entityType":"test"}\n' +
        '{"type":"entity","name":"entity2","entityType":"test"}\n';
      fs.readFile.mockResolvedValue(existingData);
      
      const relations = [{ from: 'entity1', to: 'entity2', relationType: 'uses' }];
      
      const result = await memoryService.createRelations(relations);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        from: 'entity1',
        to: 'entity2',
        relationType: 'uses'
      });
      expect(result[0]).toHaveProperty('createdAt');
    });

    it('should throw NotFoundError for non-existing entities', async () => {
      fs.readFile.mockResolvedValue('');
      
      const relations = [{ from: 'missing1', to: 'missing2', relationType: 'uses' }];
      
      await expect(memoryService.createRelations(relations)).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteEntity', () => {
    it('should delete entity and its relations', async () => {
      const existingData = 
        '{"type":"entity","name":"entity1","entityType":"test"}\n' +
        '{"type":"entity","name":"entity2","entityType":"test"}\n' +
        '{"type":"relation","from":"entity1","to":"entity2","relationType":"uses"}\n';
      fs.readFile.mockResolvedValue(existingData);
      
      const result = await memoryService.deleteEntity('entity1');
      
      expect(result.entity.name).toBe('entity1');
      expect(result.deletedRelations).toBe(1);
      
      // Verify the write call
      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[0]).toContain('.tmp');
      const writtenData = writeCall[1];
      expect(writtenData).not.toContain('entity1');
    });

    it('should throw NotFoundError for non-existing entity', async () => {
      fs.readFile.mockResolvedValue('');
      
      await expect(memoryService.deleteEntity('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('searchEntities', () => {
    it('should search entities by name', async () => {
      const existingData = 
        '{"type":"entity","name":"TestEntity","entityType":"test"}\n' +
        '{"type":"entity","name":"OtherEntity","entityType":"other"}\n';
      fs.readFile.mockResolvedValue(existingData);
      
      const results = await memoryService.searchEntities('test');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('TestEntity');
    });

    it('should search entities by type', async () => {
      const existingData = 
        '{"type":"entity","name":"Entity1","entityType":"project"}\n' +
        '{"type":"entity","name":"Entity2","entityType":"person"}\n';
      fs.readFile.mockResolvedValue(existingData);
      
      const results = await memoryService.searchEntities('project');
      
      expect(results).toHaveLength(1);
      expect(results[0].entityType).toBe('project');
    });

    it('should search entities by observations', async () => {
      const existingData = 
        '{"type":"entity","name":"Entity1","entityType":"test","observations":["contains important data"]}\n';
      fs.readFile.mockResolvedValue(existingData);
      
      const results = await memoryService.searchEntities('important');
      
      expect(results).toHaveLength(1);
    });
  });

  describe('file locking', () => {
    it('should acquire and release lock', async () => {
      const memory = { entities: [], relations: [] };
      
      // Start a write operation
      const writePromise = memoryService.writeMemory(memory);
      
      // Try to acquire lock while write is in progress
      expect(memoryService.isLocked).toBe(true);
      
      await writePromise;
      
      expect(memoryService.isLocked).toBe(false);
    });

    it('should timeout when waiting for lock', async () => {
      memoryService.isLocked = true;
      
      await expect(memoryService.acquireLock(100)).rejects.toThrow('Timeout waiting for file lock');
    });
  });
});