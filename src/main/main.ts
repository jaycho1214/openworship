/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * OpenWorship - Main Process Entry Point
 * Open-source worship presentation software
 *
 * This file handles only app lifecycle and initialization.
 * All IPC handlers are in src/main/ipc/
 * Window management is in src/main/windows/
 */
import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { databaseService } from './services/database';
import {
  createControlWindow,
  recreateControlWindow,
} from './windows/WindowManager';
import { registerAllHandlers } from './ipc';

/**
 * App updater configuration
 */
class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
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

app
  .whenReady()
  .then(async () => {
    log.info('[App] Starting OpenWorship...');

    // Initialize database
    databaseService.init();
    log.info('[App] Database initialized');

    // Register all IPC handlers
    registerAllHandlers();

    // Create the main control window
    await createControlWindow();
    log.info('[App] Control window created');

    // macOS: re-create window when dock icon is clicked
    app.on('activate', () => {
      recreateControlWindow();
    });

    // Initialize auto-updater (non-blocking)
    // eslint-disable-next-line no-new
    new AppUpdater();

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
