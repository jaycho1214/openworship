/**
 * IPC utilities for the main process
 * Provides standardized error handling for IPC handlers
 */
import log from 'electron-log';

/**
 * Standard IPC response type
 */
export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

/**
 * Create a success response
 */
export function successResponse<T>(data?: T): IpcResponse<T> {
  return { success: true, data };
}

/**
 * Create an error response and log it
 */
export function errorResponse(error: unknown, logPrefix: string): IpcResponse {
  const message = getErrorMessage(error);
  log.error(`${logPrefix}:`, message);
  return { success: false, error: message };
}
