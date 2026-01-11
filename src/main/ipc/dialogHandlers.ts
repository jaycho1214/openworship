/**
 * IPC handlers for file system dialogs
 */
import { ipcMain, dialog } from 'electron';
import log from 'electron-log';
import type { SaveFileOptions, OpenFileOptions } from '../../shared/types';

export const registerDialogHandlers = (): void => {
  // Select folder dialog
  ipcMain.handle('dialog:selectFolder', async (_event, title: string) => {
    const result = await dialog.showOpenDialog({
      title,
      properties: ['openDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Save file dialog
  ipcMain.handle(
    'dialog:saveFile',
    async (_event, options: SaveFileOptions) => {
      const result = await dialog.showSaveDialog({
        title: options.title,
        defaultPath: options.defaultPath,
        filters: options.filters,
      });
      if (result.canceled) return null;
      return result.filePath;
    },
  );

  // Open file dialog
  ipcMain.handle(
    'dialog:openFile',
    async (_event, options: OpenFileOptions) => {
      const result = await dialog.showOpenDialog({
        title: options.title,
        properties: ['openFile'],
        filters: options.filters,
      });
      if (result.canceled) return null;
      return result.filePaths[0];
    },
  );

  log.info('[IPC] Dialog handlers registered');
};
