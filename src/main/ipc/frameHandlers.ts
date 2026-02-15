/**
 * Frame IPC handlers
 * Handles frame-related requests from renderer
 */

import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../services/database';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';
import type {
  Frame,
  FrameInput,
  FrameUpdateInput,
  FrameSettings,
} from '../../shared/types/frame';
import { settingsService } from '../services/settings';

/**
 * Get the directory for storing frame images
 */
const getFramesPath = (): string => {
  const userDataPath = app.getPath('userData');
  const framesPath = path.join(userDataPath, 'frames');
  if (!fs.existsSync(framesPath)) {
    fs.mkdirSync(framesPath, { recursive: true });
  }
  return framesPath;
};

/**
 * Convert DB frame to Frame type
 */
const dbToFrame = (db: any): Frame => ({
  id: db.id,
  name: db.name,
  type: db.type,
  imagePath: db.imagePath,
  sliceSize: db.sliceSize,
  borderWidth: db.borderWidth,
  borderColor: db.borderColor,
  borderRadius: db.borderRadius,
  backgroundColor: db.backgroundColor,
  boxShadow: db.boxShadow,
  padding:
    db.paddingTop !== null
      ? {
          top: db.paddingTop,
          right: db.paddingRight,
          bottom: db.paddingBottom,
          left: db.paddingLeft,
        }
      : undefined,
  createdAt: db.createdAt,
  updatedAt: db.updatedAt,
});

/**
 * Register all Frame IPC handlers
 */
export const registerFrameHandlers = (): void => {
  // Get all frames
  ipcMain.handle('frame:getAll', async () => {
    try {
      const dbFrames = databaseService.getAllFrames();
      const frames = dbFrames.map(dbToFrame);
      return successResponse(frames);
    } catch (error) {
      log.error('[Frame] Error getting frames:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Get a specific frame
  ipcMain.handle('frame:getById', async (_, id: string) => {
    try {
      const dbFrame = databaseService.getFrameById(id);
      const frame = dbFrame ? dbToFrame(dbFrame) : null;
      return successResponse(frame);
    } catch (error) {
      log.error('[Frame] Error getting frame:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Add a frame
  ipcMain.handle('frame:add', async (_, input: FrameInput) => {
    try {
      let imagePath: string | undefined;

      // If it's an image frame, copy the image to the frames directory
      if (input.type === 'image' && input.imagePath) {
        const framesDir = getFramesPath();
        const ext = path.extname(input.imagePath);
        const fileName = `${uuidv4()}${ext}`;
        const destPath = path.join(framesDir, fileName);

        fs.copyFileSync(input.imagePath, destPath);
        imagePath = destPath;
      }

      const dbFrame = databaseService.addFrame({
        name: input.name,
        type: input.type,
        imagePath,
        sliceSize: input.type === 'image' ? input.sliceSize : undefined,
        borderWidth: input.type === 'css' ? input.borderWidth : undefined,
        borderColor: input.type === 'css' ? input.borderColor : undefined,
        borderRadius: input.type === 'css' ? input.borderRadius : undefined,
        backgroundColor:
          input.type === 'css' ? input.backgroundColor : undefined,
        boxShadow: input.type === 'css' ? input.boxShadow : undefined,
        paddingTop: input.padding?.top,
        paddingRight: input.padding?.right,
        paddingBottom: input.padding?.bottom,
        paddingLeft: input.padding?.left,
      });

      const frame = dbToFrame(dbFrame);
      return successResponse(frame);
    } catch (error) {
      log.error('[Frame] Error adding frame:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Update a frame
  ipcMain.handle(
    'frame:update',
    async (_, id: string, updates: FrameUpdateInput) => {
      try {
        const dbFrame = databaseService.updateFrame(id, {
          name: updates.name,
          sliceSize: updates.sliceSize,
          borderWidth: updates.borderWidth,
          borderColor: updates.borderColor,
          borderRadius: updates.borderRadius,
          backgroundColor: updates.backgroundColor,
          boxShadow: updates.boxShadow,
          paddingTop: updates.padding?.top,
          paddingRight: updates.padding?.right,
          paddingBottom: updates.padding?.bottom,
          paddingLeft: updates.padding?.left,
        });

        const frame = dbFrame ? dbToFrame(dbFrame) : null;
        return successResponse(frame);
      } catch (error) {
        log.error('[Frame] Error updating frame:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  // Delete a frame
  ipcMain.handle('frame:delete', async (_, id: string) => {
    try {
      // Get the frame to delete its image if it exists
      const frame = databaseService.getFrameById(id);
      if (frame?.imagePath && fs.existsSync(frame.imagePath)) {
        fs.unlinkSync(frame.imagePath);
      }

      const success = databaseService.deleteFrame(id);
      return successResponse(success);
    } catch (error) {
      log.error('[Frame] Error deleting frame:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Import frame from file picker
  ipcMain.handle('frame:importImage', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return errorResponse('No window available');
      }

      const result = await dialog.showOpenDialog(window, {
        title: 'Import Frame Image',
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || !result.filePaths[0]) {
        return { success: true, canceled: true };
      }

      const filePath = result.filePaths[0];
      return successResponse(filePath);
    } catch (error) {
      log.error('[Frame] Error importing frame image:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Get frame settings (which frame is assigned to which content type)
  ipcMain.handle('frame:getSettings', async () => {
    try {
      const settings = settingsService.getFrameSettings();
      return successResponse(settings);
    } catch (error) {
      log.error('[Frame] Error getting frame settings:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Set frame settings
  ipcMain.handle(
    'frame:setSettings',
    async (_, settings: Partial<FrameSettings>) => {
      try {
        const updated = settingsService.setFrameSettings(settings);
        return successResponse(updated);
      } catch (error) {
        log.error('[Frame] Error setting frame settings:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  log.info('[Frame] Handlers registered');
};
