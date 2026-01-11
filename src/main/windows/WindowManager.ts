/**
 * Window management for OpenWorship
 * Handles creation and lifecycle of control and projection windows
 */
import path from 'path';
import { app, BrowserWindow, shell, screen } from 'electron';
import log from 'electron-log';
import { settingsService } from '../services/settings';
import MenuBuilder from '../menu';
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
      webSecurity: false, // TODO: Replace with protocol handler for local files
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

  // Open urls in the user's browser
  controlWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

/**
 * Create the projection window on external display
 */
export const createProjectionWindow = (): BrowserWindow => {
  const settings = settingsService.getProjectionSettings();
  const isWindowed = settings.displayMode === 'windowed';

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
      webSecurity: false, // TODO: Replace with protocol handler for local files
    },
  });

  projectionWindow.loadURL(resolveHtmlPath('projection.html'));

  projectionWindow.on('closed', () => {
    projectionWindow = null;
    // Notify control window that projection closed
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('projection:closed');
    }
  });

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
 * Recreate the control window (for macOS dock click)
 */
export const recreateControlWindow = async (): Promise<void> => {
  if (controlWindow === null) {
    await createControlWindow();
  }
};
