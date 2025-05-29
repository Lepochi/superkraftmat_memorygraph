/**
 * Custom error classes for the Memory System
 */

class MemoryError extends Error {
  constructor(message, statusCode = 500, code = 'MEMORY_ERROR') {
    super(message);
    this.name = 'MemoryError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends MemoryError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class NotFoundError extends MemoryError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends MemoryError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

class FileSystemError extends MemoryError {
  constructor(message) {
    super(message, 500, 'FILE_SYSTEM_ERROR');
  }
}

// Error handler middleware
function errorHandler(err, req, res, next) {
  // Log error
  console.error(`[${new Date().toISOString()}] Error:`, {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method
  });

  // Handle known errors
  if (err instanceof MemoryError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      errors: err.errors || undefined
    });
  }

  // Handle Joi validation errors
  if (err.name === 'ValidationError' && err.isJoi) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      code: 'INVALID_JSON'
    });
  }

  // Default error response
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    code: 'INTERNAL_ERROR'
  });
}

module.exports = {
  MemoryError,
  ValidationError,
  NotFoundError,
  ConflictError,
  FileSystemError,
  errorHandler
};