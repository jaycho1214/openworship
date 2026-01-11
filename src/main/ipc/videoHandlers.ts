/**
 * IPC handlers for video management
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { videoService } from '../services/VideoService';
import type { VideoData } from '../../shared/types';

export const registerVideoHandlers = (): void => {
  // Get all videos
  ipcMain.handle('videos:getEmbedded', async () => {
    return videoService.getAllVideos();
  });

  // Add a video
  ipcMain.handle('videos:add', async (_event, videoData: VideoData) => {
    return videoService.addVideo(videoData.fileName, videoData.base64);
  });

  // Delete a video
  ipcMain.handle('videos:delete', async (_event, filePath: string) => {
    return videoService.deleteVideo(filePath);
  });

  log.info('[IPC] Video handlers registered');
};
