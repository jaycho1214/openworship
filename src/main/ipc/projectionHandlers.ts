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
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';

export const registerProjectionHandlers = (): void => {
  // Open projection window
  ipcMain.handle('projection:open', () => {
    try {
      const projectionWindow = getProjectionWindow();
      if (!projectionWindow) {
        createProjectionWindow();
        return successResponse(true);
      }
      projectionWindow.show();
      return successResponse(true);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Projection] Error opening projection:', message);
      return errorResponse(message);
    }
  });

  // Close projection window
  ipcMain.handle('projection:close', () => {
    try {
      closeProjectionWindow();
      return successResponse(true);
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Projection] Error closing projection:', message);
      return errorResponse(message);
    }
  });

  // Check if projection is open
  ipcMain.handle('projection:isOpen', () => {
    try {
      return successResponse(isProjectionOpen());
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Projection] Error checking projection status:', message);
      return errorResponse(message);
    }
  });

  // Set display mode (fullscreen or windowed)
  ipcMain.handle(
    'projection:setDisplayMode',
    (_event, mode: 'fullscreen' | 'windowed') => {
      try {
        settingsService.setProjectionSettings({ displayMode: mode });

        // If projection is open, recreate it with new mode
        if (isProjectionOpen()) {
          closeProjectionWindow();
          createProjectionWindow();
        }
        return successResponse(true);
      } catch (error) {
        const message = getErrorMessage(error);
        log.error('[Projection] Error setting display mode:', message);
        return errorResponse(message);
      }
    },
  );

  // Forward messages from control to projection window.
  // Each channel is forwarded with the same name to the projection window.
  const forwardToProjection = (channel: string) => {
    ipcMain.on(channel, (_event, data) => {
      const projectionWindow = getProjectionWindow();
      if (projectionWindow && !projectionWindow.isDestroyed()) {
        projectionWindow.webContents.send(channel, data);
      }
    });
  };

  // Simple forwarding channels (control -> projection)
  const forwardChannels = [
    'projection:update',
    'projection:blank',
    'projection:verseHidden',
    'projection:video',
    'projection:font',
    'projection:image',
    'projection:backgroundColor',
    'projection:advertisement',
    'projection:frame',
  ];
  forwardChannels.forEach(forwardToProjection);

  // Forward ready signal from projection to control window (reverse direction)
  ipcMain.on('projection:ready', () => {
    log.info('[Projection] Window is ready');
    const controlWindow = getControlWindow();
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('projection:ready');
    }
  });

  // Get available displays info
  ipcMain.handle('displays:getAll', () => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      return successResponse(
        screen.getAllDisplays().map((display) => ({
          id: display.id,
          bounds: display.bounds,
          isPrimary: display.id === primaryDisplay.id,
        })),
      );
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Projection] Error getting displays:', message);
      return errorResponse(message);
    }
  });

  log.info('[IPC] Projection handlers registered');
};
