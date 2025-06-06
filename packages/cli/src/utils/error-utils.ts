/**
 * Error utility functions
 */

export function isErrorInstance(error: unknown): error is Error {
  return error instanceof Error;
}

export function formatError(error: unknown): string {
  if (isErrorInstance(error)) {
    return error.message;
  }
  return String(error);
}

export function createError(message: string, code?: string): Error {
  const error = new Error(message);
  if (code) {
    (error as any).code = code;
  }
  return error;
}

export function handleAsyncError<T>(
  promise: Promise<T>,
  fallback?: T
): Promise<[T | null, Error | null]> {
  return promise
    .then<[T, null]>((data: T) => [data, null])
    .catch<[T | null, Error]>((error: Error) => [fallback || null, error]);
}
