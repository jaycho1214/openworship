/**
 * Settings and projection display types
 * Used by both main and renderer processes
 */

export interface TextShadowSettings {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface TextOutlineSettings {
  enabled: boolean;
  width: number;
  color: string;
}

export interface TextAlignSettings {
  horizontal: 'left' | 'center' | 'right';
  vertical: 'top' | 'middle' | 'bottom';
}

export interface PaddingSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type AnimationType = 'none' | 'fade' | 'slide-up' | 'slide-left';
export type DisplayMode = 'fullscreen' | 'windowed';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'en' | 'ko';

export interface ProjectionSettings {
  fontSize: number;
  textColor: string;
  textShadow: TextShadowSettings;
  textOutline: TextOutlineSettings;
  backgroundDim: number;
  animation: AnimationType;
  displayMode: DisplayMode;
  textAlign: TextAlignSettings;
  textJustify?: 'left' | 'center' | 'right';
  lineGap?: number;
  padding?: PaddingSettings;
}

export interface AppSettings {
  hasApiKey: boolean;
  language: Language;
  theme: ThemeMode;
  projection: ProjectionSettings;
  assetsMigrated: boolean;
}

// Default projection settings
export const defaultProjectionSettings: ProjectionSettings = {
  fontSize: 72,
  textColor: '#ffffff',
  textShadow: {
    enabled: true,
    offsetX: 0,
    offsetY: 0,
    blur: 8,
    color: 'rgba(0,0,0,0.9)',
  },
  textOutline: {
    enabled: false,
    width: 2,
    color: '#000000',
  },
  backgroundDim: 0,
  animation: 'fade',
  displayMode: 'fullscreen',
  textAlign: {
    horizontal: 'center',
    vertical: 'middle',
  },
  textJustify: 'center',
  lineGap: 12,
  padding: {
    top: 5,
    bottom: 5,
    left: 5,
    right: 5,
  },
};
