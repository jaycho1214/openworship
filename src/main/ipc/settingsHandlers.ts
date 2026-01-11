/**
 * IPC handlers for settings management
 */
import fs from 'fs';
import path from 'path';
import { ipcMain, app } from 'electron';
import log from 'electron-log';
import { settingsService, ProjectionSettings } from '../services/settings';
import { databaseService } from '../services/database';
import { getProjectionWindow } from '../windows/WindowManager';
import { getErrorMessage } from '../../shared/types';

export const registerSettingsHandlers = (): void => {
  // Get all settings
  ipcMain.handle('settings:getAll', () => {
    return settingsService.getAllSettings();
  });

  // Get API key status (not the actual key for security)
  ipcMain.handle('settings:hasApiKey', () => {
    return settingsService.hasApiKey();
  });

  // Set API key
  ipcMain.handle('settings:setApiKey', (_event, apiKey: string) => {
    try {
      settingsService.setApiKey(apiKey);
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Settings] Error setting API key:', message);
      return { success: false, error: message };
    }
  });

  // Test API key by making a simple API call
  ipcMain.handle('settings:testApiKey', async (_event, apiKey: string) => {
    try {
      // Dynamic import to avoid loading OpenAI when not needed
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey });
      await client.models.list();
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Settings] API key test failed:', message);
      return { success: false, error: message };
    }
  });

  // Get language setting
  ipcMain.handle('settings:getLanguage', () => {
    return settingsService.getLanguage();
  });

  // Set language setting
  ipcMain.handle('settings:setLanguage', (_event, language: 'en' | 'ko') => {
    settingsService.setLanguage(language);
    return { success: true };
  });

  // Get theme setting
  ipcMain.handle('settings:getTheme', () => {
    return settingsService.getTheme();
  });

  // Set theme setting
  ipcMain.handle(
    'settings:setTheme',
    (_event, theme: 'light' | 'dark' | 'system') => {
      settingsService.setTheme(theme);
      return { success: true };
    },
  );

  // Get projection settings
  ipcMain.handle('settings:getProjection', () => {
    return settingsService.getProjectionSettings();
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
      return { success: true };
    },
  );

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

      // Reset settings
      settingsService.resetAll();
      log.info('[FactoryReset] Reset settings');

      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[FactoryReset] Error:', message);
      return { success: false, error: message };
    }
  });

  log.info('[IPC] Settings handlers registered');
};
