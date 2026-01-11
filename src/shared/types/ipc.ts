/**
 * IPC channel and response types
 * Used by both main and renderer processes
 */

// Fire-and-forget channels (send)
export type SendChannels =
  | 'projection:update'
  | 'projection:blank'
  | 'projection:verseHidden'
  | 'projection:video'
  | 'projection:font'
  | 'projection:closed'
  | 'projection:ready'
  | 'projection:settings';

// Request-response channels (invoke)
export type InvokeChannels =
  // Projection
  | 'projection:open'
  | 'projection:close'
  | 'projection:isOpen'
  | 'projection:setDisplayMode'
  // Dialogs
  | 'dialog:selectFolder'
  | 'dialog:saveFile'
  | 'dialog:openFile'
  // Displays
  | 'displays:getAll'
  // OCR
  | 'ocr:parseImage'
  | 'ocr:parseImages'
  // Videos
  | 'videos:getEmbedded'
  | 'videos:add'
  | 'videos:delete'
  // Fonts
  | 'fonts:getLyricsFont'
  | 'fonts:getAll'
  | 'fonts:add'
  | 'fonts:delete'
  // Setlist
  | 'setlist:save'
  | 'setlist:load'
  // Settings
  | 'settings:getAll'
  | 'settings:hasApiKey'
  | 'settings:setApiKey'
  | 'settings:testApiKey'
  | 'settings:getLanguage'
  | 'settings:setLanguage'
  | 'settings:getTheme'
  | 'settings:setTheme'
  | 'settings:getProjection'
  | 'settings:setProjection'
  | 'settings:factoryReset'
  // Library
  | 'library:getAll'
  | 'library:getById'
  | 'library:search'
  | 'library:findByTitle'
  | 'library:add'
  | 'library:update'
  | 'library:delete'
  | 'library:deleteMany'
  | 'library:getCategories'
  | 'library:getTags'
  | 'library:getCount'
  // Sessions
  | 'session:getAll'
  | 'session:getById'
  | 'session:create'
  | 'session:update'
  | 'session:delete'
  | 'session:addSong'
  | 'session:removeSong'
  | 'session:reorderSongs'
  | 'session:getCount';

/**
 * Standard IPC response type
 * All IPC handlers should return this format
 */
export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create a success response
 */
export function successResponse<T>(data?: T): IpcResponse<T> {
  return { success: true, data };
}

/**
 * Create an error response
 */
export function errorResponse(error: string): IpcResponse {
  return { success: false, error };
}

// OCR types
export interface OcrResult {
  title: string;
  lyrics: string;
}

export interface OcrImageResult {
  index: number;
  success: boolean;
  data?: OcrResult;
  error?: string;
  imagePreview?: string;
}

// Video types
export interface VideoData {
  fileName: string;
  base64: string;
}

// Font types
export interface FontData {
  fileName: string;
  base64: string;
}

// Dialog types
export interface SaveFileOptions {
  title: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface OpenFileOptions {
  title: string;
  filters?: { name: string; extensions: string[] }[];
}
