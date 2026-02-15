// Per-slide display overrides (optional, falls back to global ProjectionSettings)
export interface SlideOverrides {
  fontSize?: number; // 48-144px
  textAlign?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  };
  padding?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  // Bible reference line overrides
  referenceFontSize?: number;
  referenceTextColor?: string;
}

export interface Slide {
  id: string;
  lines: string[]; // 1-3 lines max
  section?: string; // Optional section marker like "Verse", "Chorus", "Bridge"
  sectionRef?: string; // Reference to another section by name (e.g., "Chorus" to repeat)
  fontSize?: number; // Optional per-slide font size override (48-144px) - kept for backwards compatibility
  overrides?: SlideOverrides; // All per-slide display overrides
  lineRoles?: ('body' | 'reference')[]; // Role of each line (e.g., Bible reference vs body text)
}

export interface Song {
  id: string;
  title: string;
  rawLyrics: string;
  slides: Slide[]; // Auto-generated from rawLyrics
  createdAt: string;
  updatedAt: string;
}

export interface Setlist {
  id: string;
  name: string; // e.g., "주일예배 1월 12일"
  songs: Song[];
  createdAt: string;
  updatedAt: string;
}

export interface PresentationState {
  currentSongIndex: number;
  currentSlideIndex: number;
  isBlank: boolean;
  isVerseHidden: boolean;
  currentVideoPath: string | null;
}

// Font type from main process
export interface DetectedFont {
  name: string;
  fileName: string;
  filePath: string;
  format: 'truetype' | 'woff' | 'woff2';
  dataUrl: string;
  isUserFont?: boolean;
}

// Projection display settings
export interface ProjectionSettings {
  fontSize: number;
  textColor: string;
  textShadow: {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  textOutline: {
    enabled: boolean;
    width: number;
    color: string;
  };
  backgroundDim: number;
  animation: 'none' | 'fade' | 'slide-up' | 'slide-left';
  displayMode: 'fullscreen' | 'windowed';
  // Position of text block within the projection
  textAlign: {
    horizontal: 'left' | 'center' | 'right';
    vertical: 'top' | 'middle' | 'bottom';
  };
  // CSS text-align for text within the block
  textJustify?: 'left' | 'center' | 'right';
  // Gap between lines in pixels
  lineGap?: number;
  padding?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  // Background settings
  backgroundType?: 'video' | 'image' | 'color';
  backgroundColor?: string;
  backgroundImagePath?: string;
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
