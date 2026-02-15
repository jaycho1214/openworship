/**
 * Shared types for OpenWorship
 * Re-exports all types from domain-specific modules
 */

// Song and presentation types
export type {
  SlideOverrides,
  Slide,
  Song,
  Setlist,
  PresentationState,
  DetectedFont,
} from './song';

// Settings types
export type {
  TextShadowSettings,
  TextOutlineSettings,
  TextAlignSettings,
  PaddingSettings,
  AnimationType,
  DisplayMode,
  ThemeMode,
  Language,
  BackgroundType,
  ColorPreset,
  ProjectionSettings,
  AppSettings,
  TextStyleSettings,
  BibleReferenceStyle,
  BibleTextStyleSettings,
  ContentTypeTextSettings,
} from './settings';
export {
  defaultProjectionSettings,
  COLOR_PRESETS,
  defaultTextStyleSettings,
  defaultBibleReferenceStyle,
  defaultContentTypeTextSettings,
} from './settings';

// Library types
export type {
  LibrarySong,
  LibrarySongInput,
  DbSession,
  DbSessionWithSongs,
} from './library';

// IPC types
export type {
  SendChannels,
  InvokeChannels,
  IpcResponse,
  OcrResult,
  OcrImageResult,
  VideoData,
  ImageData,
  FontData,
  SaveFileOptions,
  OpenFileOptions,
} from './ipc';
export { successResponse, errorResponse } from './ipc';

// Error types
export type { AppError } from './errors';
export { ErrorCode, createError, getErrorMessage, isAppError } from './errors';

// Export/Import types
export type {
  OpenWorshipFile,
  ExportedSong,
  ExportedSession,
  ImportPreview,
  ImportOptions,
  ImportResult,
} from './export';

// Advertisement types
export type {
  Advertisement,
  AdvertisementState,
  AdvertisementCreateInput,
  AdvertisementUpdateInput,
  AdvertisementDisplaySettings,
  ProjectionAdvertisementMessage,
} from './advertisement';
export { DEFAULT_DISPLAY_SETTINGS } from './advertisement';

// Bible types
export type {
  BibleTranslation,
  BibleBook,
  BibleVerse,
  BibleReference,
  BibleImportData,
  BibleImportBook,
  BibleImportChapter,
  BibleImportVerse,
  BibleDisplayMode,
  BibleVerseSelection,
  BibleDownloadInfo,
  BibleImportProgress,
} from './bible';

// Setlist item types (unified content)
export type {
  SetlistItem,
  SongSetlistItem,
  BibleSetlistItem,
  AnnouncementSetlistItem,
  SetlistItemInput,
  SongSetlistItemInput,
  BibleSetlistItemInput,
  AnnouncementSetlistItemInput,
  UnifiedSetlist,
  SetlistItemType,
} from './setlistItem';
export {
  isSongItem,
  isBibleItem,
  isAnnouncementItem,
  getItemLabel,
  getItemSlides,
  getItemSlideCount,
} from './setlistItem';

// Frame types
export type {
  Frame,
  FrameType,
  FramePadding,
  FrameSettings,
  FrameInput,
  ImageFrameInput,
  CssFrameInput,
  FrameUpdateInput,
} from './frame';
export { defaultFrameSettings, getFrameIdForType } from './frame';
