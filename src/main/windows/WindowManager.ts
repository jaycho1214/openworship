/**
 * Window management for OpenWorship
 * Handles creation and lifecycle of control and projection windows
 */
import path from 'path';
import { app, BrowserWindow, shell, screen } from 'electron';
import log from 'electron-log';
import { settingsService } from '../services/settings';
import MenuBuilder, { setProjectionWindowRef } from '../menu';
import { resolveHtmlPath } from '../util';

let controlWindow: BrowserWindow | null = null;
let projectionWindow: BrowserWindow | null = null;

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../../assets');

export const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

export const getPreloadPath = (): string => {
  // preload.js is always in the same directory as main.js
  // Dev: .erb/dll/preload.js, Prod: release/app/dist/main/preload.js
  return path.join(__dirname, 'preload.js');
};

/**
 * Get the control window instance
 */
export const getControlWindow = (): BrowserWindow | null => controlWindow;

/**
 * Get the projection window instance
 */
export const getProjectionWindow = (): BrowserWindow | null => projectionWindow;

/**
 * Create the main control window
 */
export const createControlWindow = async (): Promise<void> => {
  controlWindow = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: getAssetPath('icon.png'),
    title: 'OpenWorship',
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  controlWindow.loadURL(resolveHtmlPath('control.html'));

  controlWindow.on('ready-to-show', () => {
    if (!controlWindow) {
      throw new Error('"controlWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      controlWindow.minimize();
    } else {
      controlWindow.show();
    }
  });

  controlWindow.on('closed', () => {
    controlWindow = null;
    // Close projection window when control window closes
    if (projectionWindow) {
      projectionWindow.close();
    }
  });

  const menuBuilder = new MenuBuilder(controlWindow);
  menuBuilder.buildMenu();

  // Prevent navigation to untrusted URLs
  controlWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'app:' && parsedUrl.hostname !== 'localhost') {
      event.preventDefault();
      log.warn('Blocked navigation to:', navigationUrl);
    }
  });

  // Open urls in the user's browser
  controlWindow.webContents.setWindowOpenHandler((edata) => {
    const parsedUrl = new URL(edata.url);
    if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') {
      shell.openExternal(edata.url);
    } else {
      log.warn('Blocked external URL with unsafe protocol:', edata.url);
    }
    return { action: 'deny' };
  });
};

/**
 * Create the projection window on external display
 */
export const createProjectionWindow = (
  overrideMode?: 'fullscreen' | 'windowed',
): BrowserWindow => {
  const settings = settingsService.getProjectionSettings();
  const isWindowed = (overrideMode ?? settings.displayMode) === 'windowed';

  // Find external display
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const externalDisplay = displays.find(
    (display) => display.id !== primaryDisplay.id,
  );

  const targetDisplay = externalDisplay || primaryDisplay;
  const { x, y, width, height } = targetDisplay.bounds;

  // Window dimensions for windowed mode
  const windowedWidth = 1280;
  const windowedHeight = 720;
  const windowedX = Math.round(x + (width - windowedWidth) / 2);
  const windowedY = Math.round(y + (height - windowedHeight) / 2);

  projectionWindow = new BrowserWindow({
    x: isWindowed ? windowedX : x,
    y: isWindowed ? windowedY : y,
    width: isWindowed ? windowedWidth : width,
    height: isWindowed ? windowedHeight : height,
    fullscreen: !isWindowed,
    frame: isWindowed,
    resizable: isWindowed,
    alwaysOnTop: !isWindowed,
    skipTaskbar: !isWindowed,
    icon: getAssetPath('icon.png'),
    title: 'OpenWorship - Projection',
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  projectionWindow.loadURL(resolveHtmlPath('projection.html'));

  // Prevent navigation to untrusted URLs
  projectionWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'app:' && parsedUrl.hostname !== 'localhost') {
      event.preventDefault();
      log.warn('Blocked navigation to:', navigationUrl);
    }
  });

  projectionWindow.on('closed', () => {
    projectionWindow = null;
    setProjectionWindowRef(null);
    // Notify control window that projection closed
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('projection:closed');
    }
    // Update live preview dimensions (revert to display-based)
    sendProjectionTargetToControl();
  });

  // Send initial dimensions once window is ready
  projectionWindow.once('ready-to-show', () => {
    sendProjectionTargetToControl();
  });

  // Track resize in windowed mode (debounced)
  let resizeTimer: NodeJS.Timeout | null = null;
  projectionWindow.on('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sendProjectionTargetToControl();
    }, 100);
  });

  // Set reference for dev tools menu
  setProjectionWindowRef(projectionWindow);

  // Prevent projection window from being focused accidentally
  projectionWindow.on('focus', () => {
    if (controlWindow && !controlWindow.isDestroyed()) {
      // Keep control window accessible
    }
  });

  log.info('[Windows] Projection window created');
  return projectionWindow;
};

/**
 * Check if projection window is currently open
 */
export const isProjectionOpen = (): boolean => {
  return projectionWindow !== null && !projectionWindow.isDestroyed();
};

/**
 * Close the projection window
 */
export const closeProjectionWindow = (): boolean => {
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.close();
    return true;
  }
  return false;
};

/**
 * Switch projection window from fullscreen to windowed mode on primary display.
 * Used when the external display is disconnected and only one monitor remains.
 * Does NOT change the saved displayMode setting so reconnection can auto-restore fullscreen.
 */
const switchProjectionToWindowed = (): void => {
  if (!projectionWindow || projectionWindow.isDestroyed()) return;

  const repositionWindow = () => {
    if (!projectionWindow || projectionWindow.isDestroyed()) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.bounds;
    const windowedWidth = 1280;
    const windowedHeight = 720;
    projectionWindow.setBounds({
      x: Math.round(x + (width - windowedWidth) / 2),
      y: Math.round(y + (height - windowedHeight) / 2),
      width: windowedWidth,
      height: windowedHeight,
    });
  };

  projectionWindow.setAlwaysOnTop(false);
  projectionWindow.setSkipTaskbar(false);
  projectionWindow.setResizable(true);

  if (projectionWindow.isFullScreen()) {
    // On macOS, setFullScreen(false) triggers an async animation.
    // Listen for the event to reposition after it completes.
    // On Windows/Linux, the event fires immediately.
    projectionWindow.once('leave-full-screen', repositionWindow);
    projectionWindow.setFullScreen(false);
  } else {
    repositionWindow();
  }
};

/**
 * Send the current projection target dimensions to the control window.
 * Uses actual projection window size if open, otherwise computes from display info.
 */
export const sendProjectionTargetToControl = (): void => {
  if (!controlWindow || controlWindow.isDestroyed()) return;

  try {
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      const [width, height] = projectionWindow.getContentSize();
      if (width > 0 && height > 0) {
        controlWindow.webContents.send('displays:targetChanged', {
          width,
          height,
        });
        return;
      }
    }

    // Compute from display info
    const settings = settingsService.getProjectionSettings();
    if (settings.displayMode === 'windowed') {
      controlWindow.webContents.send('displays:targetChanged', {
        width: 1280,
        height: 720,
      });
      return;
    }

    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    const externalDisplay = displays.find((d) => d.id !== primaryDisplay.id);
    const target = externalDisplay || primaryDisplay;
    controlWindow.webContents.send('displays:targetChanged', {
      width: target.bounds.width,
      height: target.bounds.height,
    });
  } catch (err) {
    log.warn('[Windows] Failed to send projection target dimensions:', err);
  }
};

/**
 * Recreate the control window (for macOS dock click)
 */
export const recreateControlWindow = async (): Promise<void> => {
  if (controlWindow === null) {
    await createControlWindow();
  }
};

/**
 * Register display event listeners for handling resolution changes,
 * display removal, and display addition while projection is open.
 */
export const registerDisplayEventListeners = (): void => {
  // When display metrics change (e.g., resolution change), update projection bounds
  screen.on('display-metrics-changed', (_event, display, changedMetrics) => {
    if (!projectionWindow || projectionWindow.isDestroyed()) return;

    const settings = settingsService.getProjectionSettings();
    if (settings.displayMode !== 'fullscreen') return;

    // Only react to size/bounds changes
    if (
      !changedMetrics.includes('bounds') &&
      !changedMetrics.includes('workArea')
    )
      return;

    // Check if projection is on this display
    const projBounds = projectionWindow.getBounds();
    const displayBounds = display.bounds;
    const isOnThisDisplay =
      projBounds.x >= displayBounds.x &&
      projBounds.x < displayBounds.x + displayBounds.width &&
      projBounds.y >= displayBounds.y &&
      projBounds.y < displayBounds.y + displayBounds.height;

    if (isOnThisDisplay) {
      log.info('[Windows] Display metrics changed, updating projection bounds');
      projectionWindow.setBounds(display.bounds);
      projectionWindow.setFullScreen(true);
      sendProjectionTargetToControl();
    }
  });

  // When a display is removed, switch to windowed or recreate on another display
  screen.on('display-removed', (_event, removedDisplay) => {
    if (!projectionWindow || projectionWindow.isDestroyed()) return;

    const projBounds = projectionWindow.getBounds();
    const removedBounds = removedDisplay.bounds;
    const wasOnRemovedDisplay =
      projBounds.x >= removedBounds.x &&
      projBounds.x < removedBounds.x + removedBounds.width &&
      projBounds.y >= removedBounds.y &&
      projBounds.y < removedBounds.y + removedBounds.height;

    if (wasOnRemovedDisplay) {
      const remainingDisplays = screen.getAllDisplays();
      if (remainingDisplays.length <= 1) {
        // Only one monitor left — switch to windowed so control window stays accessible
        log.info(
          '[Windows] Projection display removed, only 1 display remains — switching to windowed',
        );
        switchProjectionToWindowed();
        sendProjectionTargetToControl();
      } else {
        // Multiple displays remain — recreate on another one
        log.info(
          '[Windows] Projection display removed, recreating on available display',
        );
        projectionWindow.close();
        createProjectionWindow();
      }
    }
  });

  // When a display is added, move projection to the new external display.
  // This also handles restoring fullscreen after HDMI reconnect when projection
  // was temporarily switched to windowed mode by the display-removed handler.
  screen.on('display-added', (_event, newDisplay) => {
    if (!projectionWindow || projectionWindow.isDestroyed()) return;

    const settings = settingsService.getProjectionSettings();
    // Only auto-move if the user's saved preference is fullscreen
    if (settings.displayMode !== 'fullscreen') return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const projBounds = projectionWindow.getBounds();
    const primaryBounds = primaryDisplay.bounds;

    // Move if currently on primary (either fullscreen fallback or windowed fallback)
    // and the new display is external
    const isOnPrimary =
      projBounds.x >= primaryBounds.x &&
      projBounds.x < primaryBounds.x + primaryBounds.width &&
      projBounds.y >= primaryBounds.y &&
      projBounds.y < primaryBounds.y + primaryBounds.height;

    if (isOnPrimary && newDisplay.id !== primaryDisplay.id) {
      log.info('[Windows] External display added, moving projection to it');
      projectionWindow.close();
      createProjectionWindow();
    }
  });

  // Also notify control window when displays change even if projection is not open,
  // so the live preview uses the correct target dimensions
  screen.on('display-added', () => {
    sendProjectionTargetToControl();
  });
  screen.on('display-removed', () => {
    // Delay slightly to let the display list update
    setTimeout(() => sendProjectionTargetToControl(), 200);
  });
};
