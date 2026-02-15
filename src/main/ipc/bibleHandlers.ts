/**
 * Bible IPC handlers
 * Handles Bible-related requests from renderer
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';
import { bibleService } from '../services/BibleService';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';
import type { BibleDisplayMode } from '../../shared/types/bible';

/**
 * Register all Bible IPC handlers
 */
export const registerBibleHandlers = (): void => {
  // Get all translations
  ipcMain.handle('bible:getTranslations', async () => {
    try {
      const translations = bibleService.getTranslations();
      return successResponse(translations);
    } catch (error) {
      log.error('[Bible] Error getting translations:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Get a specific translation
  ipcMain.handle('bible:getTranslation', async (_, id: string) => {
    try {
      const translation = bibleService.getTranslation(id);
      return successResponse(translation);
    } catch (error) {
      log.error('[Bible] Error getting translation:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Get books for a translation
  ipcMain.handle('bible:getBooks', async (_, translationId: string) => {
    try {
      const books = bibleService.getBooks(translationId);
      return successResponse(books);
    } catch (error) {
      log.error('[Bible] Error getting books:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Get verses for a chapter
  ipcMain.handle(
    'bible:getVerses',
    async (_, bookId: string, chapter: number) => {
      try {
        const verses = bibleService.getVerses(bookId, chapter);
        return successResponse(verses);
      } catch (error) {
        log.error('[Bible] Error getting verses:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  // Get verses in a range
  ipcMain.handle(
    'bible:getVersesRange',
    async (
      _,
      bookId: string,
      chapter: number,
      startVerse: number,
      endVerse: number,
    ) => {
      try {
        const verses = bibleService.getVersesRange(
          bookId,
          chapter,
          startVerse,
          endVerse,
        );
        return successResponse(verses);
      } catch (error) {
        log.error('[Bible] Error getting verses range:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  // Get verse count for a chapter
  ipcMain.handle(
    'bible:getVerseCount',
    async (_, bookId: string, chapter: number) => {
      try {
        const count = bibleService.getVerseCount(bookId, chapter);
        return successResponse(count);
      } catch (error) {
        log.error('[Bible] Error getting verse count:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  // Search verses
  ipcMain.handle(
    'bible:searchVerses',
    async (_, translationId: string, query: string, limit?: number) => {
      try {
        const verses = bibleService.searchVerses(translationId, query, limit);
        return successResponse(verses);
      } catch (error) {
        log.error('[Bible] Error searching verses:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  // Convert verses to slides
  ipcMain.handle(
    'bible:versesToSlides',
    async (
      _,
      bookId: string,
      bookName: string,
      chapter: number,
      startVerse: number,
      endVerse: number,
      displayMode: BibleDisplayMode,
    ) => {
      try {
        const verses = bibleService.getVersesRange(
          bookId,
          chapter,
          startVerse,
          endVerse,
        );
        const slides = bibleService.versesToSlides(
          verses,
          bookName,
          chapter,
          displayMode,
        );
        return successResponse(slides);
      } catch (error) {
        log.error('[Bible] Error converting verses to slides:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  // Import Bible from file
  ipcMain.handle('bible:importFromFile', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return errorResponse('No window available');
      }

      const result = await dialog.showOpenDialog(window, {
        title: 'Import Bible Translation',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (result.canceled || !result.filePaths[0]) {
        return { success: true, canceled: true };
      }

      const translation = await bibleService.importBibleFromFile(
        result.filePaths[0],
        (progress, message) => {
          // Send progress to renderer
          event.sender.send('bible:importProgress', { progress, message });
        },
      );

      return successResponse(translation);
    } catch (error) {
      log.error('[Bible] Error importing Bible:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Download and import Bible
  ipcMain.handle('bible:downloadAndImport', async (event, bibleId: string) => {
    try {
      const availableBibles = bibleService.getAvailableBibles();
      const downloadInfo = availableBibles.find((b) => b.id === bibleId);

      if (!downloadInfo) {
        return errorResponse('Bible not found');
      }

      const translation = await bibleService.downloadAndImportBible(
        downloadInfo,
        (progress, message) => {
          // Send progress to renderer
          event.sender.send('bible:importProgress', { progress, message });
        },
      );

      return successResponse(translation);
    } catch (error) {
      log.error('[Bible] Error downloading Bible:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Delete translation
  ipcMain.handle('bible:deleteTranslation', async (_, id: string) => {
    try {
      const success = bibleService.deleteTranslation(id);
      return successResponse(success);
    } catch (error) {
      log.error('[Bible] Error deleting translation:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Get available built-in Bibles
  ipcMain.handle('bible:getAvailableBibles', async () => {
    try {
      const bibles = bibleService.getAvailableBibles();
      return successResponse(bibles);
    } catch (error) {
      log.error('[Bible] Error getting available Bibles:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  log.info('[Bible] Handlers registered');
};
