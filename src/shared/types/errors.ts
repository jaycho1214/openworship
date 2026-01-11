/**
 * Error types and utilities
 * Used by both main and renderer processes
 */

export enum ErrorCode {
  // Generic
  UNKNOWN = 'UNKNOWN',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',

  // Database
  DB_NOT_INITIALIZED = 'DB_NOT_INITIALIZED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',

  // File operations
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',

  // API
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',

  // Projection
  PROJECTION_NOT_OPEN = 'PROJECTION_NOT_OPEN',
  PROJECTION_ALREADY_OPEN = 'PROJECTION_ALREADY_OPEN',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Create a standardized error object
 */
export function createError(
  code: ErrorCode,
  message: string,
  details?: unknown,
): AppError {
  return { code, message, details };
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}
