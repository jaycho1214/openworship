/**
 * Error types and utilities
 * Used by both main and renderer processes
 */

export interface AppError {
  message: string;
  details?: unknown;
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
