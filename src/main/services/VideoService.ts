/**
 * Video service for managing user videos
 */
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import log from 'electron-log';
import type { IpcResponse } from '../../shared/types';
import { getErrorMessage } from '../../shared/types';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

/**
 * Get the user videos directory path
 */
export const getUserVideosPath = (): string => {
  return path.join(app.getPath('userData'), 'videos');
};

/**
 * Ensure the videos directory exists
 */
const ensureVideosDir = (): void => {
  const videosPath = getUserVideosPath();
  if (!fs.existsSync(videosPath)) {
    fs.mkdirSync(videosPath, { recursive: true });
  }
};

/**
 * Get all videos from the user videos folder
 */
export const getAllVideos = (): string[] => {
  const userVideosPath = getUserVideosPath();
  log.info('[VideoService] Scanning user videos:', userVideosPath);

  try {
    ensureVideosDir();

    const files = fs.readdirSync(userVideosPath);
    const videoFiles = files
      .filter((file) =>
        VIDEO_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext)),
      )
      .map((file) => path.join(userVideosPath, file));

    log.info('[VideoService] Found videos:', videoFiles.length);
    return videoFiles;
  } catch (error) {
    log.error('[VideoService] Error reading videos folder:', error);
    return [];
  }
};

/**
 * Add a video to the user videos folder
 */
export const addVideo = (
  fileName: string,
  base64Data: string,
): IpcResponse<string> => {
  try {
    const userVideosPath = getUserVideosPath();
    ensureVideosDir();

    // Generate unique filename if already exists
    let finalFileName = fileName;
    let filePath = path.join(userVideosPath, finalFileName);
    let counter = 1;

    while (fs.existsSync(filePath)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      finalFileName = `${base}_${counter}${ext}`;
      filePath = path.join(userVideosPath, finalFileName);
      counter++;
    }

    // Write the video file
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    log.info('[VideoService] Added video:', filePath);
    return { success: true, data: filePath };
  } catch (error) {
    log.error('[VideoService] Error adding video:', error);
    return { success: false, error: getErrorMessage(error) };
  }
};

/**
 * Delete a video from the user videos folder
 */
export const deleteVideo = (filePath: string): IpcResponse<void> => {
  try {
    const userVideosPath = getUserVideosPath();

    // Security check: only allow deleting from user videos folder
    if (!filePath.startsWith(userVideosPath)) {
      log.warn(
        '[VideoService] Attempted to delete video outside user folder:',
        filePath,
      );
      return { success: false, error: 'Cannot delete bundled videos' };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Video not found' };
    }

    fs.unlinkSync(filePath);
    log.info('[VideoService] Deleted video:', filePath);
    return { success: true };
  } catch (error) {
    log.error('[VideoService] Error deleting video:', error);
    return { success: false, error: getErrorMessage(error) };
  }
};

export const videoService = {
  getUserVideosPath,
  getAllVideos,
  addVideo,
  deleteVideo,
};
