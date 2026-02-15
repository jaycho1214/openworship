/**
 * IPC handlers for OCR (optical character recognition)
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import {
  parseLyricsFromImage,
  parseLyricsFromImages,
} from '../services/openaiService';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';

export const registerOcrHandlers = (): void => {
  // Parse lyrics from a single image
  ipcMain.handle(
    'ocr:parseImage',
    async (_event, imageBase64: string, mimeType: string) => {
      try {
        const result = await parseLyricsFromImage(imageBase64, mimeType);
        return successResponse(result);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[OCR] Parse error:', message);
        return errorResponse(message);
      }
    },
  );

  // Batch process multiple images
  ipcMain.handle(
    'ocr:parseImages',
    async (_event, images: Array<{ base64: string; mimeType: string }>) => {
      try {
        const results = await parseLyricsFromImages(images);
        return successResponse(results);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[OCR] Batch parse error:', message);
        return errorResponse(message);
      }
    },
  );

  log.info('[IPC] OCR handlers registered');
};
