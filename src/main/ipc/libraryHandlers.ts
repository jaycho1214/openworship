/**
 * IPC handlers for song library
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { databaseService, LibrarySongInput } from '../services/database';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';

export const registerLibraryHandlers = (): void => {
  // Get all songs
  ipcMain.handle('library:getAll', () => {
    try {
      return successResponse(databaseService.getAllSongs());
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting songs:', message);
      return errorResponse(message);
    }
  });

  // Get song by ID
  ipcMain.handle('library:getById', (_event, id: string) => {
    try {
      const song = databaseService.getSongById(id);
      if (!song) return errorResponse('Song not found');
      return successResponse(song);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting song:', message);
      return errorResponse(message);
    }
  });

  // Search songs
  ipcMain.handle('library:search', (_event, query: string) => {
    try {
      return successResponse(databaseService.searchSongs(query));
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error searching songs:', message);
      return errorResponse(message);
    }
  });

  // Find song by title (exact match, case-insensitive)
  ipcMain.handle('library:findByTitle', (_event, title: string) => {
    try {
      const song = databaseService.findSongByTitle(title);
      return successResponse(song);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error finding song by title:', message);
      return errorResponse(message);
    }
  });

  // Add song
  ipcMain.handle('library:add', (_event, song: LibrarySongInput) => {
    try {
      const newSong = databaseService.addSong(song);
      return successResponse(newSong);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error adding song:', message);
      return errorResponse(message);
    }
  });

  // Update song
  ipcMain.handle(
    'library:update',
    (_event, id: string, updates: Partial<LibrarySongInput>) => {
      try {
        const updated = databaseService.updateSong(id, updates);
        if (!updated) return errorResponse('Song not found');
        return successResponse(updated);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Library] Error updating song:', message);
        return errorResponse(message);
      }
    },
  );

  // Delete song
  ipcMain.handle('library:delete', (_event, id: string) => {
    try {
      const deleted = databaseService.deleteSong(id);
      if (!deleted) return errorResponse('Song not found');
      return successResponse(true);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error deleting song:', message);
      return errorResponse(message);
    }
  });

  // Delete multiple songs
  ipcMain.handle('library:deleteMany', (_event, ids: string[]) => {
    try {
      const count = databaseService.deleteSongs(ids);
      return successResponse({ count });
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error deleting songs:', message);
      return errorResponse(message);
    }
  });

  // Get all categories
  ipcMain.handle('library:getCategories', () => {
    try {
      return successResponse(databaseService.getAllCategories());
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting categories:', message);
      return errorResponse(message);
    }
  });

  // Get all tags
  ipcMain.handle('library:getTags', () => {
    try {
      return successResponse(databaseService.getAllTags());
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting tags:', message);
      return errorResponse(message);
    }
  });

  // Get songs count
  ipcMain.handle('library:getCount', () => {
    try {
      return successResponse(databaseService.getSongsCount());
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting songs count:', message);
      return errorResponse(message);
    }
  });

  log.info('[IPC] Library handlers registered');
};
