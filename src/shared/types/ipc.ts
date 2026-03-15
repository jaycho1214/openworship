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
  | 'projection:image'
  | 'projection:backgroundColor'
  | 'projection:font'
  | 'projection:closed'
  | 'projection:ready'
  | 'projection:settings'
  | 'projection:advertisement'
  | 'projection:frame'
  | 'projection:contentTypeText'
  | 'projection:overlayNote'
  | 'bible:importProgress'
  | 'file:open'
  | 'displays:targetChanged';

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
  | 'displays:getProjectionTarget'
  // OCR
  | 'ocr:parseImage'
  | 'ocr:parseImages'
  // Videos
  | 'videos:getEmbedded'
  | 'videos:add'
  | 'videos:delete'
  // Images
  | 'images:getAll'
  | 'images:add'
  | 'images:delete'
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
  | 'settings:getContentTypeText'
  | 'settings:setContentTypeText'
  | 'settings:setBibleReferenceStyle'
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
  | 'session:getCount'
  // Export/Import
  | 'export:song'
  | 'export:session'
  | 'export:library'
  | 'import:preview'
  | 'import:previewPath'
  | 'import:execute'
  // Advertisements
  | 'ad:getAll'
  | 'ad:getById'
  | 'ad:add'
  | 'ad:update'
  | 'ad:delete'
  | 'ad:reorder'
  | 'ad:getDisplaySettings'
  | 'ad:setDisplaySettings'
  // Settings (recent items)
  | 'settings:getRecentItems'
  | 'settings:addRecentItem'
  | 'settings:clearRecentItems'
  // Bible
  | 'bible:getTranslations'
  | 'bible:getTranslation'
  | 'bible:getBooks'
  | 'bible:getVerses'
  | 'bible:getVersesRange'
  | 'bible:getVerseCount'
  | 'bible:searchVerses'
  | 'bible:versesToSlides'
  | 'bible:importFromFile'
  | 'bible:downloadAndImport'
  | 'bible:deleteTranslation'
  | 'bible:getAvailableBibles'
  // Frames
  | 'frame:getAll'
  | 'frame:getById'
  | 'frame:add'
  | 'frame:update'
  | 'frame:delete'
  | 'frame:importImage'
  | 'frame:getSettings'
  | 'frame:setSettings'
  // Session Items (Unified Setlist)
  | 'sessionItem:getAll'
  | 'sessionItem:add'
  | 'sessionItem:update'
  | 'sessionItem:delete'
  | 'sessionItem:reorder';

/**
 * Standard IPC response type (discriminated union)
 * All IPC handlers should return this format
 */
export type IpcResponse<T = void> =
  | (T extends void
      ? { success: true; data?: undefined }
      : { success: true; data: T })
  | { success: false; error: string };

/**
 * Create a success response
 */
export function successResponse<T>(data: T): IpcResponse<T>;
export function successResponse(): IpcResponse<void>;
export function successResponse<T>(data?: T): IpcResponse<T> {
  if (data === undefined) {
    return { success: true } as IpcResponse<T>;
  }
  return { success: true, data } as IpcResponse<T>;
}

/**
 * Create an error response
 */
export function errorResponse(error: string): IpcResponse<never> {
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

// Image types
export interface ImageData {
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
