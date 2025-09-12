/**
 * Error handling for type-sync generation
 */

export class TypeSyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TypeSyncError';
  }
}

export class SchemaValidationError extends TypeSyncError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SCHEMA_VALIDATION_ERROR', context);
    this.name = 'SchemaValidationError';
  }
}

export class GenerationError extends TypeSyncError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GENERATION_ERROR', context);
    this.name = 'GenerationError';
  }
}

export class FileSystemError extends TypeSyncError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'FILE_SYSTEM_ERROR', context);
    this.name = 'FileSystemError';
  }
}

export class ValidationError extends TypeSyncError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export function handleError(error: unknown, context?: Record<string, unknown>): TypeSyncError {
  if (error instanceof TypeSyncError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new TypeSyncError(error.message, 'UNKNOWN_ERROR', { ...context, originalError: error });
  }
  
  return new TypeSyncError('An unknown error occurred', 'UNKNOWN_ERROR', context);
}
