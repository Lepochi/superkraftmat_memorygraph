const Joi = require('joi');

// Schema definitions
const schemas = {
  entity: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    entityType: Joi.string().min(1).max(50).required(),
    observations: Joi.array().items(Joi.string()).optional()
  }),

  relation: Joi.object({
    from: Joi.string().min(1).max(255).required(),
    to: Joi.string().min(1).max(255).required(),
    relationType: Joi.string().min(1).max(50).required()
  }),

  createEntities: Joi.object({
    entities: Joi.array().items(Joi.object({
      name: Joi.string().min(1).max(255).required(),
      entityType: Joi.string().min(1).max(50).required(),
      observations: Joi.array().items(Joi.string()).optional()
    })).min(1).required()
  }),

  createRelations: Joi.object({
    relations: Joi.array().items(Joi.object({
      from: Joi.string().min(1).max(255).required(),
      to: Joi.string().min(1).max(255).required(),
      relationType: Joi.string().min(1).max(50).required()
    })).min(1).required()
  }),

  entityName: Joi.string().min(1).max(255).required()
};

// Validation middleware factory
function validate(schemaName) {
  return async (req, res, next) => {
    try {
      const schema = schemas[schemaName];
      if (!schema) {
        throw new Error(`Schema ${schemaName} not found`);
      }

      // Determine what to validate based on the request
      let dataToValidate;
      if (schemaName === 'entityName') {
        dataToValidate = req.params.name;
      } else {
        dataToValidate = req.body;
      }

      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          error: 'Validation failed',
          errors
        });
      }

      // Replace request data with validated and sanitized data
      if (schemaName === 'entityName') {
        req.params.name = value;
      } else {
        req.body = value;
      }

      next();
    } catch (err) {
      console.error('Validation middleware error:', err);
      res.status(500).json({
        error: 'Internal validation error'
      });
    }
  };
}

// Custom validators
const customValidators = {
  // Check if entity name contains invalid characters
  isValidEntityName: (name) => {
    const invalidChars = /[<>:"\/\\|?*\x00-\x1F]/;
    return !invalidChars.test(name);
  },

  // Check if relation type is valid
  isValidRelationType: (type) => {
    const validTypes = [
      'implements', 'uses', 'manages', 'contains', 
      'owns', 'creates', 'depends_on', 'relates_to',
      'works_with', 'belongs_to', 'responsible_for'
    ];
    return validTypes.includes(type.toLowerCase());
  }
};

module.exports = {
  validate,
  schemas,
  customValidators
};