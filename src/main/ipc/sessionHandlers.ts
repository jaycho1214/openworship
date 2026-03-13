/**
 * IPC handlers for session management (database-backed)
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { databaseService } from '../services/database';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';

export const registerSessionHandlers = (): void => {
  // Get all sessions
  ipcMain.handle('session:getAll', () => {
    try {
      return successResponse(databaseService.getAllSessions());
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error getting sessions:', message);
      return errorResponse(message);
    }
  });

  // Get session by ID (with songs)
  ipcMain.handle('session:getById', (_event, id: string) => {
    try {
      const session = databaseService.getSessionById(id);
      if (!session) return errorResponse('Session not found');
      return successResponse(session);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error getting session:', message);
      return errorResponse(message);
    }
  });

  // Create session
  ipcMain.handle('session:create', (_event, name: string) => {
    try {
      const session = databaseService.createSession({ name });
      return successResponse(session);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error creating session:', message);
      return errorResponse(message);
    }
  });

  // Update session
  ipcMain.handle(
    'session:update',
    (_event, id: string, updates: { name?: string }) => {
      try {
        const session = databaseService.updateSession(id, updates);
        if (!session) return errorResponse('Session not found');
        return successResponse(session);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Session] Error updating session:', message);
        return errorResponse(message);
      }
    },
  );

  // Delete session
  ipcMain.handle('session:delete', (_event, id: string) => {
    try {
      const deleted = databaseService.deleteSession(id);
      if (!deleted) return errorResponse('Session not found');
      return successResponse(true);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error deleting session:', message);
      return errorResponse(message);
    }
  });

  // Get sessions count
  ipcMain.handle('session:getCount', () => {
    try {
      return successResponse(databaseService.getSessionsCount());
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error getting sessions count:', message);
      return errorResponse(message);
    }
  });

  log.info('[IPC] Session handlers registered');
};
