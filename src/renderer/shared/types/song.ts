// Per-slide display overrides (optional, falls back to global ProjectionSettings)
export interface SlideOverrides {
  fontSize?: number; // 48-360px
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
  fontSize?: number; // Optional per-slide font size override (48-360px) - kept for backwards compatibility
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
