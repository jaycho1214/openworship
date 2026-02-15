/**
 * IPC handlers for file system dialogs
 */
import { ipcMain, dialog } from 'electron';
import log from 'electron-log';
import type { SaveFileOptions, OpenFileOptions } from '../../shared/types';
import { getErrorMessage } from '../../shared/types';

export const registerDialogHandlers = (): void => {
  // Select folder dialog
  ipcMain.handle('dialog:selectFolder', async (_event, title: string) => {
    try {
      const result = await dialog.showOpenDialog({
        title,
        properties: ['openDirectory'],
      });
      if (result.canceled) return null;
      return result.filePaths[0];
    } catch (error) {
      log.error('[Dialog] Error selecting folder:', getErrorMessage(error));
      return null;
    }
  });

  // Save file dialog
  ipcMain.handle(
    'dialog:saveFile',
    async (_event, options: SaveFileOptions) => {
      try {
        const result = await dialog.showSaveDialog({
          title: options.title,
          defaultPath: options.defaultPath,
          filters: options.filters,
        });
        if (result.canceled) return null;
        return result.filePath;
      } catch (error) {
        log.error('[Dialog] Error saving file:', getErrorMessage(error));
        return null;
      }
    },
  );

  // Open file dialog
  ipcMain.handle(
    'dialog:openFile',
    async (_event, options: OpenFileOptions) => {
      try {
        const result = await dialog.showOpenDialog({
          title: options.title,
          properties: ['openFile'],
          filters: options.filters,
        });
        if (result.canceled) return null;
        return result.filePaths[0];
      } catch (error) {
        log.error('[Dialog] Error opening file:', getErrorMessage(error));
        return null;
      }
    },
  );

  log.info('[IPC] Dialog handlers registered');
};
