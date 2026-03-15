/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * OpenWorship - Main Process Entry Point
 * Open-source worship presentation software
 *
 * This file handles only app lifecycle and initialization.
 * All IPC handlers are in src/main/ipc/
 * Window management is in src/main/windows/
 */
import path from 'path';
import { app, protocol, net } from 'electron';
import { pathToFileURL } from 'url';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { databaseService } from './services/database';
import {
  createControlWindow,
  recreateControlWindow,
  getControlWindow,
  registerDisplayEventListeners,
} from './windows/WindowManager';
import { registerAllHandlers } from './ipc';

// Global error handlers - log but don't crash
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});

// Track file to open from file association
let pendingFilePath: string | null = null;

/**
 * Register 'app://' as a privileged scheme before app is ready.
 * This must be called synchronously at module load time.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

/**
 * Initialize auto-updater (non-blocking)
 */
function initAutoUpdater(): void {
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();
}

/**
 * Enable source map support in production
 */
if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

/**
 * App lifecycle handlers
 */
app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Handle file association - macOS
 * When user opens .oworship file, this event is triggered
 */
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  log.info('[App] Open file event:', filePath);

  if (app.isReady()) {
    // App is already running, send to window
    const controlWindow = getControlWindow();
    if (controlWindow) {
      controlWindow.webContents.send('file:open', filePath);
    }
  } else {
    // App is starting, save for later
    pendingFilePath = filePath;
  }
});

/**
 * Handle file association - Windows/Linux
 * When user opens .oworship file, a second instance is created with file path
 */
// Skip single-instance lock in test mode (each test run has its own userData)
const isTestMode = !!process.env.OPENWORSHIP_TEST_USER_DATA;
const gotTheLock = isTestMode || app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    log.info('[App] Second instance with args:', commandLine);

    // Find the file path in command line arguments
    const filePath = commandLine.find((arg) => arg.endsWith('.oworship'));
    if (filePath) {
      const controlWindow = getControlWindow();
      if (controlWindow) {
        controlWindow.webContents.send('file:open', filePath);
        if (controlWindow.isMinimized()) {
          controlWindow.restore();
        }
        controlWindow.focus();
      }
    }
  });
}

app
  .whenReady()
  .then(async () => {
    log.info('[App] Starting OpenWorship...');

    // Register custom app:// protocol to serve local files securely
    protocol.handle('app', (request) => {
      const url = new URL(request.url);
      // Resolve the file path from the URL pathname
      let filePath = decodeURIComponent(url.pathname);
      // On Windows, URL pathname is /C:/Users/... — strip leading / before drive letter
      if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }
      filePath = path.normalize(filePath);

      // Prevent directory traversal attacks
      const userDataPath = app.getPath('userData');
      const resolvedPath = path.resolve(filePath);
      if (
        !resolvedPath.startsWith(userDataPath) &&
        !resolvedPath.startsWith(path.resolve(process.resourcesPath || ''))
      ) {
        return new Response('Forbidden', { status: 403 });
      }

      return net.fetch(pathToFileURL(resolvedPath).toString());
    });

    // Override userData path for E2E testing (isolated database per test run)
    if (process.env.OPENWORSHIP_TEST_USER_DATA) {
      app.setPath('userData', process.env.OPENWORSHIP_TEST_USER_DATA);
      log.info(
        '[App] Test mode: userData overridden to',
        process.env.OPENWORSHIP_TEST_USER_DATA,
      );
    }

    // Initialize database
    databaseService.init();
    log.info('[App] Database initialized');

    // Start dev MCP server (patches ipcMain before handlers register)
    if (process.env.NODE_ENV === 'development') {
      const { startDevMcpServer } = require('./services/devMcpServer');
      startDevMcpServer();
    }

    // Register all IPC handlers
    registerAllHandlers();

    // Register display event listeners for resolution changes
    registerDisplayEventListeners();

    // Create the main control window
    await createControlWindow();
    log.info('[App] Control window created');

    // Handle pending file from file association
    if (pendingFilePath) {
      const controlWindow = getControlWindow();
      if (controlWindow) {
        // Wait for window to be ready before sending file
        controlWindow.webContents.once('did-finish-load', () => {
          controlWindow.webContents.send('file:open', pendingFilePath);
          pendingFilePath = null;
        });
      }
    }

    // macOS: re-create window when dock icon is clicked
    app.on('activate', () => {
      recreateControlWindow();
    });

    // Initialize auto-updater (non-blocking)
    initAutoUpdater();

    log.info('[App] OpenWorship ready');
  })
  .catch((error) => {
    log.error('[App] Startup error:', error);
    console.error(error);
  });

// Clean up database on quit
app.on('will-quit', () => {
  log.info('[App] Shutting down...');
  databaseService.close();
});
