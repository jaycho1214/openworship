/**
 * Core song and presentation types
 * Used by both main and renderer processes
 */

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
}

export interface Slide {
  id: string;
  lines: string[]; // 1-3 lines max
  section?: string; // Optional section marker like "Verse", "Chorus", "Bridge"
  sectionRef?: string; // Reference to another section by name (e.g., "Chorus" to repeat)
  fontSize?: number; // Optional per-slide font size override (48-144px) - kept for backwards compatibility
  overrides?: SlideOverrides; // All per-slide display overrides
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
  name: string; // e.g., "Sunday Service Jan 12"
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
