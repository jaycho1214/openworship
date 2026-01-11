/**
 * Shared types for OpenWorship
 * Re-exports all types from domain-specific modules
 */

// Song and presentation types
export type {
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
  ProjectionSettings,
  AppSettings,
} from './settings';
export { defaultProjectionSettings } from './settings';

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
  FontData,
  SaveFileOptions,
  OpenFileOptions,
} from './ipc';
export { successResponse, errorResponse } from './ipc';

// Error types
export type { AppError } from './errors';
export { ErrorCode, createError, getErrorMessage, isAppError } from './errors';
