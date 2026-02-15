/**
 * IPC handler registration
 * Registers all IPC handlers for the main process
 */
import log from 'electron-log';
import { registerProjectionHandlers } from './projectionHandlers';
import { registerDialogHandlers } from './dialogHandlers';
import { registerOcrHandlers } from './ocrHandlers';
import { registerVideoHandlers } from './videoHandlers';
import { registerImageHandlers } from './imageHandlers';
import { registerFontHandlers } from './fontHandlers';
import { registerSetlistHandlers } from './setlistHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import { registerLibraryHandlers } from './libraryHandlers';
import { registerSessionHandlers } from './sessionHandlers';
import { registerExportHandlers } from './exportHandlers';
import { registerAdvertisementHandlers } from './advertisementHandlers';
import { registerBibleHandlers } from './bibleHandlers';
import { registerFrameHandlers } from './frameHandlers';
import { registerSessionItemHandlers } from './sessionItemHandlers';

/**
 * Register all IPC handlers
 * Should be called during app initialization
 */
export const registerAllHandlers = (): void => {
  log.info('[IPC] Registering all handlers...');

  registerProjectionHandlers();
  registerDialogHandlers();
  registerOcrHandlers();
  registerVideoHandlers();
  registerImageHandlers();
  registerFontHandlers();
  registerSetlistHandlers();
  registerSettingsHandlers();
  registerLibraryHandlers();
  registerSessionHandlers();
  registerExportHandlers();
  registerAdvertisementHandlers();
  registerBibleHandlers();
  registerFrameHandlers();
  registerSessionItemHandlers();

  log.info('[IPC] All handlers registered');
};
