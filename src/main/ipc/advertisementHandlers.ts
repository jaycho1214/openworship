/**
 * IPC handlers for Advertisement operations
 */

import { ipcMain } from 'electron';
import { advertisementService } from '../services/AdvertisementService';
import { sendToProjection } from '../windows/WindowManager';
import { successResponse, errorResponse } from '../../shared/types/ipc';
import {
  AdvertisementCreateInput,
  AdvertisementUpdateInput,
  AdvertisementDisplaySettings,
  ProjectionAdvertisementMessage,
} from '../../shared/types/advertisement';
import { getErrorMessage } from '../../shared/types/errors';

export function registerAdvertisementHandlers(): void {
  // Get all advertisements
  ipcMain.handle('ad:getAll', () => {
    try {
      const ads = advertisementService.getAll();
      return successResponse(ads);
    } catch (error) {
      return errorResponse(getErrorMessage(error));
    }
  });

  // Get advertisement by ID
  ipcMain.handle('ad:getById', (_event, id: string) => {
    try {
      const ad = advertisementService.getById(id);
      if (!ad) {
        return errorResponse('Advertisement not found');
      }
      return successResponse(ad);
    } catch (error) {
      return errorResponse(getErrorMessage(error));
    }
  });

  // Add advertisement
  ipcMain.handle('ad:add', (_event, input: AdvertisementCreateInput) => {
    try {
      const ad = advertisementService.add(input);
      return successResponse(ad);
    } catch (error) {
      return errorResponse(getErrorMessage(error));
    }
  });

  // Update advertisement
  ipcMain.handle(
    'ad:update',
    (_event, id: string, updates: AdvertisementUpdateInput) => {
      try {
        const ad = advertisementService.update(id, updates);
        if (!ad) {
          return errorResponse('Advertisement not found');
        }
        return successResponse(ad);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  // Delete advertisement
  ipcMain.handle('ad:delete', (_event, id: string) => {
    try {
      const success = advertisementService.delete(id);
      if (!success) {
        return errorResponse('Advertisement not found');
      }
      return successResponse(true);
    } catch (error) {
      return errorResponse(getErrorMessage(error));
    }
  });

  // Reorder advertisements
  ipcMain.handle('ad:reorder', (_event, ids: string[]) => {
    try {
      const success = advertisementService.reorder(ids);
      return successResponse(success);
    } catch (error) {
      return errorResponse(getErrorMessage(error));
    }
  });

  // Get display settings
  ipcMain.handle('ad:getDisplaySettings', () => {
    try {
      const settings = advertisementService.getDisplaySettings();
      return successResponse(settings);
    } catch (error) {
      return errorResponse(getErrorMessage(error));
    }
  });

  // Update display settings
  ipcMain.handle(
    'ad:setDisplaySettings',
    (_event, settings: Partial<AdvertisementDisplaySettings>) => {
      try {
        const updatedSettings =
          advertisementService.setDisplaySettings(settings);
        // Also send to projection window
        sendDisplaySettingsToProjection(updatedSettings);
        return successResponse(updatedSettings);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    },
  );
}

/**
 * Send advertisement message to projection window
 */
export function sendAdvertisementToProjection(
  message: ProjectionAdvertisementMessage,
): void {
  sendToProjection('projection:advertisement', message);
}

/**
 * Send display settings update to projection window
 */
export function sendDisplaySettingsToProjection(
  settings: AdvertisementDisplaySettings,
): void {
  sendToProjection('projection:advertisement', {
    action: 'updateSettings',
    displaySettings: settings,
  } as ProjectionAdvertisementMessage);
}
