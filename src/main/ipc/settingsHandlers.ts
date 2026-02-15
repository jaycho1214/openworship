/**
 * IPC handlers for settings management
 */
import fs from 'fs';
import path from 'path';
import { ipcMain, app } from 'electron';
import log from 'electron-log';
import {
  settingsService,
  ProjectionSettings,
  RecentItem,
} from '../services/settings';
import { databaseService } from '../services/database';
import { advertisementService } from '../services/AdvertisementService';
import { getProjectionWindow } from '../windows/WindowManager';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';

export const registerSettingsHandlers = (): void => {
  // Get all settings
  ipcMain.handle('settings:getAll', () => {
    try {
      return settingsService.getAllSettings();
    } catch (error) {
      log.error(
        '[Settings] Error getting all settings:',
        getErrorMessage(error),
      );
      return {};
    }
  });

  // Get API key status (not the actual key for security)
  ipcMain.handle('settings:hasApiKey', () => {
    try {
      return settingsService.hasApiKey();
    } catch (error) {
      log.error('[Settings] Error checking API key:', getErrorMessage(error));
      return false;
    }
  });

  // Set API key
  ipcMain.handle('settings:setApiKey', (_event, apiKey: string) => {
    try {
      settingsService.setApiKey(apiKey);
      return successResponse(true);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Settings] Error setting API key:', message);
      return errorResponse(message);
    }
  });

  // Test API key by making a simple API call
  ipcMain.handle('settings:testApiKey', async (_event, apiKey: string) => {
    try {
      // Dynamic import to avoid loading OpenAI when not needed
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey });
      await client.models.list();
      return successResponse(true);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Settings] API key test failed:', message);
      return errorResponse(message);
    }
  });

  // Get language setting
  ipcMain.handle('settings:getLanguage', () => {
    try {
      return settingsService.getLanguage();
    } catch (error) {
      log.error('[Settings] Error getting language:', getErrorMessage(error));
      return 'en';
    }
  });

  // Set language setting
  ipcMain.handle('settings:setLanguage', (_event, language: 'en' | 'ko') => {
    try {
      settingsService.setLanguage(language);
      return successResponse(true);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Settings] Error setting language:', message);
      return errorResponse(message);
    }
  });

  // Get theme setting
  ipcMain.handle('settings:getTheme', () => {
    try {
      return settingsService.getTheme();
    } catch (error) {
      log.error('[Settings] Error getting theme:', getErrorMessage(error));
      return 'system';
    }
  });

  // Set theme setting
  ipcMain.handle(
    'settings:setTheme',
    (_event, theme: 'light' | 'dark' | 'system') => {
      try {
        settingsService.setTheme(theme);
        return successResponse(true);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Settings] Error setting theme:', message);
        return errorResponse(message);
      }
    },
  );

  // Get projection settings
  ipcMain.handle('settings:getProjection', () => {
    try {
      return settingsService.getProjectionSettings();
    } catch (error) {
      log.error(
        '[Settings] Error getting projection settings:',
        getErrorMessage(error),
      );
      return {};
    }
  });

  // Set projection settings
  ipcMain.handle(
    'settings:setProjection',
    (_event, settings: Partial<ProjectionSettings>) => {
      settingsService.setProjectionSettings(settings);
      // Forward to projection window if open
      const projectionWindow = getProjectionWindow();
      if (projectionWindow && !projectionWindow.isDestroyed()) {
        projectionWindow.webContents.send(
          'projection:settings',
          settingsService.getProjectionSettings(),
        );
      }
      return successResponse(true);
    },
  );

  // Get recent items
  ipcMain.handle('settings:getRecentItems', () => {
    try {
      return successResponse(settingsService.getRecentItems());
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Settings] Error getting recent items:', message);
      return errorResponse(message);
    }
  });

  // Add recent item
  ipcMain.handle(
    'settings:addRecentItem',
    (_event, item: Omit<RecentItem, 'addedAt'>) => {
      try {
        settingsService.addRecentItem(item);
        return successResponse(true);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Settings] Error adding recent item:', message);
        return errorResponse(message);
      }
    },
  );

  // Clear recent items
  ipcMain.handle('settings:clearRecentItems', () => {
    try {
      settingsService.clearRecentItems();
      return successResponse(true);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Settings] Error clearing recent items:', message);
      return errorResponse(message);
    }
  });

  // Factory reset
  ipcMain.handle('settings:factoryReset', async () => {
    try {
      // Close database connection
      databaseService.close();

      const userDataPath = app.getPath('userData');

      // Delete database file
      const dbPath = path.join(userDataPath, 'songs.db');
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        log.info('[FactoryReset] Deleted database:', dbPath);
      }

      // Delete user fonts directory
      const fontsDir = path.join(userDataPath, 'fonts');
      if (fs.existsSync(fontsDir)) {
        fs.rmSync(fontsDir, { recursive: true, force: true });
        log.info('[FactoryReset] Deleted fonts directory:', fontsDir);
      }

      // Delete user videos directory
      const videosDir = path.join(userDataPath, 'videos');
      if (fs.existsSync(videosDir)) {
        fs.rmSync(videosDir, { recursive: true, force: true });
        log.info('[FactoryReset] Deleted videos directory:', videosDir);
      }

      // Delete user images directory
      const imagesDir = path.join(userDataPath, 'images');
      if (fs.existsSync(imagesDir)) {
        fs.rmSync(imagesDir, { recursive: true, force: true });
        log.info('[FactoryReset] Deleted images directory:', imagesDir);
      }

      // Delete user frames directory
      const framesDir = path.join(userDataPath, 'frames');
      if (fs.existsSync(framesDir)) {
        fs.rmSync(framesDir, { recursive: true, force: true });
        log.info('[FactoryReset] Deleted frames directory:', framesDir);
      }

      // Clear advertisement store
      advertisementService.clearAll();
      log.info('[FactoryReset] Cleared advertisements');

      // Reset settings
      settingsService.resetAll();
      log.info('[FactoryReset] Reset settings');

      // Relaunch the app to reinitialize cleanly
      app.relaunch();
      app.exit(0);

      return successResponse(true);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[FactoryReset] Error:', message);
      return errorResponse(message);
    }
  });

  log.info('[IPC] Settings handlers registered');
};
