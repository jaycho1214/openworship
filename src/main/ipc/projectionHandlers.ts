/**
 * IPC handlers for projection window management
 */
import { ipcMain, screen, dialog } from 'electron';
import log from 'electron-log';
import {
  getControlWindow,
  getProjectionWindow,
  createProjectionWindow,
  isProjectionOpen,
  closeProjectionWindow,
  sendToProjection,
} from '../windows/WindowManager';
import { settingsService } from '../services/settings';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';

export const registerProjectionHandlers = (): void => {
  // Open projection window
  ipcMain.handle('projection:open', async () => {
    try {
      const projectionWindow = getProjectionWindow();
      if (!projectionWindow) {
        const settings = settingsService.getProjectionSettings();
        const displays = screen.getAllDisplays();

        // In test mode, always force windowed to avoid fullscreen blocking
        const isTestMode = !!process.env.OPENWORSHIP_TEST_USER_DATA;
        if (isTestMode) {
          createProjectionWindow('windowed');
          return successResponse(true);
        }

        // Warn if trying to open fullscreen with only one monitor
        if (settings.displayMode === 'fullscreen' && displays.length <= 1) {
          const parentWindow = getControlWindow();
          const dialogOptions = {
            type: 'warning' as const,
            title: 'Single Monitor Detected',
            message:
              'You only have one monitor connected. Opening the projection in fullscreen will cover your control window.',
            detail:
              'You can press Escape at any time to close the projection window.',
            buttons: ['Open in Window', 'Open Fullscreen', 'Cancel'],
            defaultId: 0,
            cancelId: 2,
          };
          // Pass parent window so the dialog appears as a sheet on macOS
          const { response } = parentWindow
            ? await dialog.showMessageBox(parentWindow, dialogOptions)
            : await dialog.showMessageBox(dialogOptions);

          if (response === 2) {
            // Cancel
            return successResponse(false);
          }
          if (response === 0) {
            // Open in Window — override mode without changing saved settings
            createProjectionWindow('windowed');
            return successResponse(true);
          }
          // response === 1: Open Fullscreen — fall through to normal creation
        }

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
      sendToProjection(channel, data);
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
    'projection:overlayNote',
  ];
  forwardChannels.forEach(forwardToProjection);

  // Forward ready signal from projection to control window (reverse direction)
  // Uses setImmediate to ensure control window listeners are attached before delivery
  ipcMain.on('projection:ready', () => {
    log.info('[Projection] Window is ready');
    setImmediate(() => {
      const controlWindow = getControlWindow();
      try {
        if (
          controlWindow &&
          !controlWindow.isDestroyed() &&
          !controlWindow.webContents.isDestroyed()
        ) {
          controlWindow.webContents.send('projection:ready');
        }
      } catch (err) {
        log.warn('[Projection] Failed to forward ready signal:', err);
      }
    });
  });

  // Get the target projection dimensions (actual window size or predicted display size)
  ipcMain.handle('displays:getProjectionTarget', () => {
    try {
      const projectionWindow = getProjectionWindow();

      // If projection window is open, use its actual content size
      if (projectionWindow && !projectionWindow.isDestroyed()) {
        const [width, height] = projectionWindow.getContentSize();
        // Guard against race condition during window creation (size may be 0)
        if (width > 0 && height > 0) {
          return successResponse({ width, height });
        }
      }

      // Projection not open — compute what createProjectionWindow would use
      const settings = settingsService.getProjectionSettings();
      const isWindowed = settings.displayMode === 'windowed';

      if (isWindowed) {
        return successResponse({ width: 1280, height: 720 });
      }

      // Fullscreen: use target display bounds
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();
      const externalDisplay = displays.find((d) => d.id !== primaryDisplay.id);
      const targetDisplay = externalDisplay || primaryDisplay;

      return successResponse({
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      log.error('[Projection] Error getting projection target:', message);
      return errorResponse(message);
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
