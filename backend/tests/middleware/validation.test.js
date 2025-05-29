const { validate, customValidators } = require('../../src/middleware/validation');

describe('Validation Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validate middleware', () => {
    describe('createEntities validation', () => {
      const middleware = validate('createEntities');
      
      it('should pass valid entity data', async () => {
        req.body = {
          entities: [
            { name: 'Test Entity', entityType: 'project', observations: ['test'] }
          ]
        };
        
        await middleware(req, res, next);
        
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject empty entities array', async () => {
        req.body = { entities: [] };
        
        await middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Validation failed',
          errors: expect.any(Array)
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject entity without name', async () => {
        req.body = {
          entities: [{ entityType: 'project' }]
        };
        
        await middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Validation failed',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'entities.0.name',
              message: expect.stringContaining('required')
            })
          ])
        });
      });

      it('should reject entity with name too long', async () => {
        req.body = {
          entities: [{
            name: 'a'.repeat(256),
            entityType: 'project'
          }]
        };
        
        await middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('should strip unknown fields', async () => {
        req.body = {
          entities: [{
            name: 'Test',
            entityType: 'project',
            unknownField: 'should be removed'
          }],
          anotherUnknown: 'also removed'
        };
        
        await middleware(req, res, next);
        
        expect(req.body).toEqual({
          entities: [{
            name: 'Test',
            entityType: 'project'
          }]
        });
        expect(next).toHaveBeenCalled();
      });
    });

    describe('createRelations validation', () => {
      const middleware = validate('createRelations');
      
      it('should pass valid relation data', async () => {
        req.body = {
          relations: [
            { from: 'Entity1', to: 'Entity2', relationType: 'uses' }
          ]
        };
        
        await middleware(req, res, next);
        
        expect(next).toHaveBeenCalled();
      });

      it('should reject relation without from field', async () => {
        req.body = {
          relations: [{ to: 'Entity2', relationType: 'uses' }]
        };
        
        await middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Validation failed',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'relations.0.from'
            })
          ])
        });
      });
    });

    describe('entityName validation', () => {
      const middleware = validate('entityName');
      
      it('should pass valid entity name', async () => {
        req.params.name = 'ValidEntityName';
        
        await middleware(req, res, next);
        
        expect(next).toHaveBeenCalled();
      });

      it('should reject empty entity name', async () => {
        req.params.name = '';
        
        await middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
      });
    });

    it('should handle missing schema', async () => {
      const middleware = validate('nonExistentSchema');
      
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal validation error'
      });
    });
  });

  describe('customValidators', () => {
    describe('isValidEntityName', () => {
      it('should accept valid entity names', () => {
        expect(customValidators.isValidEntityName('ValidName')).toBe(true);
        expect(customValidators.isValidEntityName('Entity 123')).toBe(true);
        expect(customValidators.isValidEntityName('Project-A')).toBe(true);
      });

      it('should reject entity names with invalid characters', () => {
        expect(customValidators.isValidEntityName('Name<script>')).toBe(false);
        expect(customValidators.isValidEntityName('Path/Name')).toBe(false);
        expect(customValidators.isValidEntityName('Name:Port')).toBe(false);
        expect(customValidators.isValidEntityName('Name\x00')).toBe(false);
      });
    });

    describe('isValidRelationType', () => {
      it('should accept valid relation types', () => {
        expect(customValidators.isValidRelationType('uses')).toBe(true);
        expect(customValidators.isValidRelationType('MANAGES')).toBe(true);
        expect(customValidators.isValidRelationType('depends_on')).toBe(true);
      });

      it('should reject invalid relation types', () => {
        expect(customValidators.isValidRelationType('unknown_type')).toBe(false);
        expect(customValidators.isValidRelationType('custom')).toBe(false);
      });
    });
  });
});