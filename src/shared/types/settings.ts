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
export type BackgroundType = 'video' | 'image' | 'color';

// Predefined color presets for chroma key
export const COLOR_PRESETS = {
  black: '#000000',
  white: '#FFFFFF',
  green: '#00FF00',
  blue: '#0000FF',
} as const;

export type ColorPreset = keyof typeof COLOR_PRESETS;

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
  // Background settings
  backgroundType?: BackgroundType;
  backgroundColor?: string;
  backgroundImagePath?: string;
}

// Per-content-type text styling
export interface TextStyleSettings {
  fontSize: number;
  textColor: string;
  textShadow: TextShadowSettings;
  textOutline: TextOutlineSettings;
  textAlign: TextAlignSettings;
  textJustify: 'left' | 'center' | 'right';
  lineGap: number;
  padding: PaddingSettings;
}

export interface BibleReferenceStyle {
  fontSize: number;
  textColor: string;
}

export interface BibleTextStyleSettings extends TextStyleSettings {
  referenceStyle: BibleReferenceStyle;
}

export interface ContentTypeTextSettings {
  song: TextStyleSettings;
  bible: BibleTextStyleSettings;
  announcement: TextStyleSettings;
}

export const defaultTextStyleSettings: TextStyleSettings = {
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

export const defaultBibleReferenceStyle: BibleReferenceStyle = {
  fontSize: 48,
  textColor: '#cccccc',
};

export const defaultContentTypeTextSettings: ContentTypeTextSettings = {
  song: { ...defaultTextStyleSettings },
  bible: {
    ...defaultTextStyleSettings,
    referenceStyle: { ...defaultBibleReferenceStyle },
  },
  announcement: { ...defaultTextStyleSettings },
};

// Recent item types for quick-add
export interface RecentSongItem {
  type: 'song';
  songId: string;
  title: string;
  addedAt: number;
}

export interface RecentBibleItem {
  type: 'bible';
  reference: string;
  translationId: string;
  translationName: string;
  bookId: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  addedAt: number;
}

export type RecentItem = RecentSongItem | RecentBibleItem;

export type RecentItemInput =
  | Omit<RecentSongItem, 'addedAt'>
  | Omit<RecentBibleItem, 'addedAt'>;

export interface AppSettings {
  hasApiKey: boolean;
  language: Language;
  theme: ThemeMode;
  projection: ProjectionSettings;
  assetsMigrated: boolean;
  contentTypeText?: ContentTypeTextSettings;
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
  backgroundType: 'video',
  backgroundColor: '#000000',
  backgroundImagePath: undefined,
};

/**
 * Deep-merge partial projection settings with defaults,
 * ensuring all nested objects (textShadow, textOutline, textAlign, padding) are complete.
 */
export function mergeProjectionSettings(
  settings?: Partial<ProjectionSettings>,
): ProjectionSettings {
  if (!settings) return { ...defaultProjectionSettings };
  return {
    ...defaultProjectionSettings,
    ...settings,
    textShadow: {
      ...defaultProjectionSettings.textShadow,
      ...settings.textShadow,
    },
    textOutline: {
      ...defaultProjectionSettings.textOutline,
      ...settings.textOutline,
    },
    textAlign: {
      ...defaultProjectionSettings.textAlign,
      ...settings.textAlign,
    },
    padding: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ...defaultProjectionSettings.padding!,
      ...settings.padding,
    },
  };
}
