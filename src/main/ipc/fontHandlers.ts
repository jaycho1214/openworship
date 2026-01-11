/**
 * IPC handlers for font management
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { fontService } from '../services/FontService';
import { getAssetPath } from '../windows/WindowManager';
import type { FontData } from '../../shared/types';

export const registerFontHandlers = (): void => {
  // Get lyrics font
  ipcMain.handle('fonts:getLyricsFont', async () => {
    const fontPath = getAssetPath('fonts', 'ChosunCentennial_ttf.ttf');
    return fontService.getLyricsFont(fontPath);
  });

  // Get all fonts
  ipcMain.handle('fonts:getAll', async () => {
    return fontService.getAllFonts();
  });

  // Add a font
  ipcMain.handle('fonts:add', async (_event, fontData: FontData) => {
    return fontService.addFont(fontData.fileName, fontData.base64);
  });

  // Delete a font
  ipcMain.handle('fonts:delete', async (_event, fileName: string) => {
    return fontService.deleteFont(fileName);
  });

  log.info('[IPC] Font handlers registered');
};
