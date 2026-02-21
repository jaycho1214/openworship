/**
 * IPC handlers for OCR (optical character recognition)
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import {
  parseLyricsFromImage,
  parseLyricsFromImages,
  parseLyricsFromPdf,
} from '../services/openaiService';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';

export const registerOcrHandlers = (): void => {
  // Parse lyrics from a single image or PDF
  ipcMain.handle(
    'ocr:parseImage',
    async (
      _event,
      imageBase64: string,
      mimeType: string,
      filename?: string,
    ) => {
      try {
        if (mimeType === 'application/pdf') {
          // PDF: use dedicated parser, may return multiple songs
          const songs = await parseLyricsFromPdf(
            imageBase64,
            filename || 'document.pdf',
          );
          // Return first song for single-file API; use parseImages for full multi-song
          return successResponse(songs[0]);
        }
        const result = await parseLyricsFromImage(imageBase64, mimeType);
        return successResponse(result);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[OCR] Parse error:', message);
        return errorResponse(message);
      }
    },
  );

  // Batch process multiple files (images and/or PDFs)
  ipcMain.handle(
    'ocr:parseImages',
    async (
      _event,
      images: Array<{ base64: string; mimeType: string; filename?: string }>,
    ) => {
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
