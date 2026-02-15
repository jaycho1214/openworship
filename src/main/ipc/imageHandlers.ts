/**
 * IPC handlers for image management
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { imageService } from '../services/ImageService';
import type { ImageData } from '../../shared/types';
import { errorResponse, getErrorMessage } from '../../shared/types';

export const registerImageHandlers = (): void => {
  // Get all images
  ipcMain.handle('images:getAll', async () => {
    try {
      return imageService.getAllImages();
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Image] Error getting images:', message);
      return errorResponse(message);
    }
  });

  // Add an image
  ipcMain.handle('images:add', async (_event, imageData: ImageData) => {
    try {
      return imageService.addImage(imageData.fileName, imageData.base64);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Image] Error adding image:', message);
      return errorResponse(message);
    }
  });

  // Delete an image
  ipcMain.handle('images:delete', async (_event, filePath: string) => {
    try {
      return imageService.deleteImage(filePath);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Image] Error deleting image:', message);
      return errorResponse(message);
    }
  });

  log.info('[IPC] Image handlers registered');
};
