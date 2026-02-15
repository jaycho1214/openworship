/**
 * IPC handlers for video management
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { videoService } from '../services/VideoService';
import type { VideoData } from '../../shared/types';
import { errorResponse, getErrorMessage } from '../../shared/types';

export const registerVideoHandlers = (): void => {
  // Get all videos
  ipcMain.handle('videos:getEmbedded', async () => {
    try {
      return videoService.getAllVideos();
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Video] Error getting videos:', message);
      return errorResponse(message);
    }
  });

  // Add a video
  ipcMain.handle('videos:add', async (_event, videoData: VideoData) => {
    try {
      return videoService.addVideo(videoData.fileName, videoData.base64);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Video] Error adding video:', message);
      return errorResponse(message);
    }
  });

  // Delete a video
  ipcMain.handle('videos:delete', async (_event, filePath: string) => {
    try {
      return videoService.deleteVideo(filePath);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Video] Error deleting video:', message);
      return errorResponse(message);
    }
  });

  log.info('[IPC] Video handlers registered');
};
