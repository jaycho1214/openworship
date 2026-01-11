/**
 * IPC handlers for song library
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { databaseService, LibrarySongInput } from '../services/database';
import { getErrorMessage } from '../../shared/types';

export const registerLibraryHandlers = (): void => {
  // Get all songs
  ipcMain.handle('library:getAll', () => {
    try {
      return { success: true, data: databaseService.getAllSongs() };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting songs:', message);
      return { success: false, error: message };
    }
  });

  // Get song by ID
  ipcMain.handle('library:getById', (_event, id: string) => {
    try {
      const song = databaseService.getSongById(id);
      if (!song) return { success: false, error: 'Song not found' };
      return { success: true, data: song };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting song:', message);
      return { success: false, error: message };
    }
  });

  // Search songs
  ipcMain.handle('library:search', (_event, query: string) => {
    try {
      return { success: true, data: databaseService.searchSongs(query) };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error searching songs:', message);
      return { success: false, error: message };
    }
  });

  // Find song by title (exact match, case-insensitive)
  ipcMain.handle('library:findByTitle', (_event, title: string) => {
    try {
      const song = databaseService.findSongByTitle(title);
      return { success: true, data: song };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error finding song by title:', message);
      return { success: false, error: message };
    }
  });

  // Add song
  ipcMain.handle('library:add', (_event, song: LibrarySongInput) => {
    try {
      const newSong = databaseService.addSong(song);
      return { success: true, data: newSong };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error adding song:', message);
      return { success: false, error: message };
    }
  });

  // Update song
  ipcMain.handle(
    'library:update',
    (_event, id: string, updates: Partial<LibrarySongInput>) => {
      try {
        const updated = databaseService.updateSong(id, updates);
        if (!updated) return { success: false, error: 'Song not found' };
        return { success: true, data: updated };
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Library] Error updating song:', message);
        return { success: false, error: message };
      }
    },
  );

  // Delete song
  ipcMain.handle('library:delete', (_event, id: string) => {
    try {
      const deleted = databaseService.deleteSong(id);
      return {
        success: deleted,
        error: deleted ? undefined : 'Song not found',
      };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error deleting song:', message);
      return { success: false, error: message };
    }
  });

  // Delete multiple songs
  ipcMain.handle('library:deleteMany', (_event, ids: string[]) => {
    try {
      const count = databaseService.deleteSongs(ids);
      return { success: true, data: { count } };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error deleting songs:', message);
      return { success: false, error: message };
    }
  });

  // Get all categories
  ipcMain.handle('library:getCategories', () => {
    try {
      return { success: true, data: databaseService.getAllCategories() };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting categories:', message);
      return { success: false, error: message };
    }
  });

  // Get all tags
  ipcMain.handle('library:getTags', () => {
    try {
      return { success: true, data: databaseService.getAllTags() };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting tags:', message);
      return { success: false, error: message };
    }
  });

  // Get songs count
  ipcMain.handle('library:getCount', () => {
    try {
      return { success: true, data: databaseService.getSongsCount() };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Library] Error getting songs count:', message);
      return { success: false, error: message };
    }
  });

  log.info('[IPC] Library handlers registered');
};
