/**
 * IPC handlers for export/import functionality
 */
import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import log from 'electron-log';
import { exportService } from '../services/ExportService';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';
import type { ImportOptions, ImportPreview } from '../../shared/types';

export const registerExportHandlers = (): void => {
  // Export a single song
  ipcMain.handle('export:song', async (_event, songId: string) => {
    try {
      const exportData = exportService.exportSong(songId);
      if (!exportData) {
        return errorResponse('Song not found');
      }

      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Export Song',
        defaultPath: `song-${Date.now()}.oworship`,
        filters: [{ name: 'OpenWorship File', extensions: ['oworship'] }],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      log.info('[Export] Song exported to:', filePath);
      return successResponse(filePath);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Export] Error exporting song:', message);
      return errorResponse(message);
    }
  });

  // Export a session with songs
  ipcMain.handle('export:session', async (_event, sessionId: string) => {
    try {
      const exportData = exportService.exportSession(sessionId);
      if (!exportData) {
        return errorResponse('Session not found');
      }

      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Export Session',
        defaultPath: `session-${Date.now()}.oworship`,
        filters: [{ name: 'OpenWorship File', extensions: ['oworship'] }],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      log.info('[Export] Session exported to:', filePath);
      return successResponse(filePath);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Export] Error exporting session:', message);
      return errorResponse(message);
    }
  });

  // Export entire library
  ipcMain.handle('export:library', async () => {
    try {
      const exportData = exportService.exportLibrary();
      if (!exportData) {
        return errorResponse('Failed to export library');
      }

      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Export Library',
        defaultPath: `library-${Date.now()}.oworship`,
        filters: [{ name: 'OpenWorship File', extensions: ['oworship'] }],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      log.info('[Export] Library exported to:', filePath);
      return successResponse(filePath);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Export] Error exporting library:', message);
      return errorResponse(message);
    }
  });

  // Open file and preview import contents
  ipcMain.handle('import:preview', async () => {
    try {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Import OpenWorship File',
        filters: [{ name: 'OpenWorship File', extensions: ['oworship'] }],
        properties: ['openFile'],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = filePaths[0];
      const content = fs.readFileSync(filePath, 'utf-8');
      const preview = exportService.parseImportFile(content);

      if (!preview) {
        return errorResponse('Invalid file format');
      }

      log.info('[Import] File preview generated:', filePath);
      return successResponse(preview);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Import] Error previewing file:', message);
      return errorResponse(message);
    }
  });

  // Import from a specific file path (for file association)
  ipcMain.handle('import:previewPath', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return errorResponse('File not found');
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const preview = exportService.parseImportFile(content);

      if (!preview) {
        return errorResponse('Invalid file format');
      }

      log.info('[Import] File preview generated from path:', filePath);
      return successResponse(preview);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Import] Error previewing file from path:', message);
      return errorResponse(message);
    }
  });

  // Execute import with selected items
  ipcMain.handle(
    'import:execute',
    async (_event, preview: ImportPreview, options: ImportOptions) => {
      try {
        const result = exportService.importSelected(preview, options);
        log.info('[Import] Import completed:', result);
        return successResponse(result);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Import] Error executing import:', message);
        return errorResponse(message);
      }
    },
  );

  log.info('[IPC] Export handlers registered');
};
