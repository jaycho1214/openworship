/**
 * IPC handlers for setlist persistence (file-based)
 */
import fs from 'fs';
import { ipcMain, dialog } from 'electron';
import log from 'electron-log';
import type { Setlist } from '../../shared/types';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';

export const registerSetlistHandlers = (): void => {
  // Save setlist to JSON file
  ipcMain.handle(
    'setlist:save',
    async (_event, setlist: Setlist, filePath?: string) => {
      try {
        let savePath = filePath;
        if (!savePath) {
          const result = await dialog.showSaveDialog({
            title: 'Save Setlist',
            defaultPath: `${setlist.name || 'setlist'}.json`,
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
          });
          if (result.canceled || !result.filePath) {
            return { success: false, canceled: true };
          }
          savePath = result.filePath;
        }

        fs.writeFileSync(savePath, JSON.stringify(setlist, null, 2), 'utf-8');
        log.info('[Setlist] Saved to:', savePath);
        return successResponse(savePath);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Setlist] Error saving:', message);
        return errorResponse(message);
      }
    },
  );

  // Load setlist from JSON file
  ipcMain.handle('setlist:load', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Load Setlist',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (result.canceled || !result.filePaths[0]) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf-8');
      const setlist = JSON.parse(content) as Setlist;
      log.info('[Setlist] Loaded from:', filePath);
      return successResponse(setlist);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Setlist] Error loading:', message);
      return errorResponse(message);
    }
  });

  log.info('[IPC] Setlist handlers registered');
};
