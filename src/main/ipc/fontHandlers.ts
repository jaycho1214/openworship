/**
 * IPC handlers for font management
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { fontService } from '../services/FontService';
import { getAssetPath } from '../windows/WindowManager';
import type { FontData } from '../../shared/types';
import { errorResponse, getErrorMessage } from '../../shared/types';

export const registerFontHandlers = (): void => {
  // Get lyrics font
  ipcMain.handle('fonts:getLyricsFont', async () => {
    try {
      const fontPath = getAssetPath('fonts', 'ChosunCentennial_ttf.ttf');
      return fontService.getLyricsFont(fontPath);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Font] Error getting lyrics font:', message);
      return errorResponse(message);
    }
  });

  // Get all fonts
  ipcMain.handle('fonts:getAll', async () => {
    try {
      return fontService.getAllFonts();
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Font] Error getting fonts:', message);
      return errorResponse(message);
    }
  });

  // Add a font
  ipcMain.handle('fonts:add', async (_event, fontData: FontData) => {
    try {
      return fontService.addFont(fontData.fileName, fontData.base64);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Font] Error adding font:', message);
      return errorResponse(message);
    }
  });

  // Delete a font
  ipcMain.handle('fonts:delete', async (_event, fileName: string) => {
    try {
      return fontService.deleteFont(fileName);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Font] Error deleting font:', message);
      return errorResponse(message);
    }
  });

  log.info('[IPC] Font handlers registered');
};
