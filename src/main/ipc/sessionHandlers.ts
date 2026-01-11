/**
 * IPC handlers for session management (database-backed)
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { databaseService } from '../services/database';
import { getErrorMessage } from '../../shared/types';

export const registerSessionHandlers = (): void => {
  // Get all sessions
  ipcMain.handle('session:getAll', () => {
    try {
      return { success: true, data: databaseService.getAllSessions() };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error getting sessions:', message);
      return { success: false, error: message };
    }
  });

  // Get session by ID (with songs)
  ipcMain.handle('session:getById', (_event, id: string) => {
    try {
      const session = databaseService.getSessionById(id);
      if (!session) return { success: false, error: 'Session not found' };
      return { success: true, data: session };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error getting session:', message);
      return { success: false, error: message };
    }
  });

  // Create session
  ipcMain.handle('session:create', (_event, name: string) => {
    try {
      const session = databaseService.createSession({ name });
      return { success: true, data: session };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error creating session:', message);
      return { success: false, error: message };
    }
  });

  // Update session
  ipcMain.handle(
    'session:update',
    (_event, id: string, updates: { name?: string }) => {
      try {
        const session = databaseService.updateSession(id, updates);
        if (!session) return { success: false, error: 'Session not found' };
        return { success: true, data: session };
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Session] Error updating session:', message);
        return { success: false, error: message };
      }
    },
  );

  // Delete session
  ipcMain.handle('session:delete', (_event, id: string) => {
    try {
      const deleted = databaseService.deleteSession(id);
      return {
        success: deleted,
        error: deleted ? undefined : 'Session not found',
      };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error deleting session:', message);
      return { success: false, error: message };
    }
  });

  // Add song to session
  ipcMain.handle(
    'session:addSong',
    (_event, sessionId: string, songId: string) => {
      try {
        const added = databaseService.addSongToSession(sessionId, songId);
        return { success: added };
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Session] Error adding song to session:', message);
        return { success: false, error: message };
      }
    },
  );

  // Remove song from session
  ipcMain.handle(
    'session:removeSong',
    (_event, sessionId: string, songId: string) => {
      try {
        const removed = databaseService.removeSongFromSession(
          sessionId,
          songId,
        );
        return { success: removed };
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Session] Error removing song from session:', message);
        return { success: false, error: message };
      }
    },
  );

  // Reorder songs in session
  ipcMain.handle(
    'session:reorderSongs',
    (_event, sessionId: string, songIds: string[]) => {
      try {
        const reordered = databaseService.reorderSessionSongs(
          sessionId,
          songIds,
        );
        return { success: reordered };
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Session] Error reordering songs in session:', message);
        return { success: false, error: message };
      }
    },
  );

  // Get sessions count
  ipcMain.handle('session:getCount', () => {
    try {
      return { success: true, data: databaseService.getSessionsCount() };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Session] Error getting sessions count:', message);
      return { success: false, error: message };
    }
  });

  log.info('[IPC] Session handlers registered');
};
