/**
 * IPC handlers for projection window management
 */
import { ipcMain, screen } from 'electron';
import log from 'electron-log';
import {
  getControlWindow,
  getProjectionWindow,
  createProjectionWindow,
  isProjectionOpen,
  closeProjectionWindow,
} from '../windows/WindowManager';
import { settingsService } from '../services/settings';

export const registerProjectionHandlers = (): void => {
  // Open projection window
  ipcMain.handle('projection:open', () => {
    const projectionWindow = getProjectionWindow();
    if (!projectionWindow) {
      createProjectionWindow();
      return true;
    }
    projectionWindow.show();
    return true;
  });

  // Close projection window
  ipcMain.handle('projection:close', () => {
    return closeProjectionWindow();
  });

  // Check if projection is open
  ipcMain.handle('projection:isOpen', () => {
    return isProjectionOpen();
  });

  // Set display mode (fullscreen or windowed)
  ipcMain.handle(
    'projection:setDisplayMode',
    (_event, mode: 'fullscreen' | 'windowed') => {
      settingsService.setProjectionSettings({ displayMode: mode });

      // If projection is open, recreate it with new mode
      if (isProjectionOpen()) {
        closeProjectionWindow();
        createProjectionWindow();
      }
      return true;
    },
  );

  // Forward messages from control to projection
  ipcMain.on('projection:update', (_event, data) => {
    const projectionWindow = getProjectionWindow();
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:update', data);
    }
  });

  ipcMain.on('projection:blank', (_event, isBlank) => {
    const projectionWindow = getProjectionWindow();
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:blank', isBlank);
    }
  });

  ipcMain.on('projection:verseHidden', (_event, isVerseHidden) => {
    const projectionWindow = getProjectionWindow();
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send(
        'projection:verseHidden',
        isVerseHidden,
      );
    }
  });

  ipcMain.on('projection:video', (_event, videoPath) => {
    log.info('[Projection] Setting video:', videoPath);
    const projectionWindow = getProjectionWindow();
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:video', videoPath);
    } else {
      log.warn('[Projection] Window not available for video');
    }
  });

  // Forward ready signal from projection to control window
  ipcMain.on('projection:ready', () => {
    log.info('[Projection] Window is ready');
    const controlWindow = getControlWindow();
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('projection:ready');
    }
  });

  ipcMain.on('projection:font', (_event, fontFamily) => {
    const projectionWindow = getProjectionWindow();
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:font', fontFamily);
    }
  });

  // Get available displays info
  ipcMain.handle('displays:getAll', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    return screen.getAllDisplays().map((display) => ({
      id: display.id,
      bounds: display.bounds,
      isPrimary: display.id === primaryDisplay.id,
    }));
  });

  log.info('[IPC] Projection handlers registered');
};
