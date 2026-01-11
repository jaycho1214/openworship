/**
 * Core song and presentation types
 * Used by both main and renderer processes
 */

export interface Slide {
  id: string;
  lines: string[]; // 1-3 lines max
  section?: string; // Optional section marker like "Verse", "Chorus", "Bridge"
  sectionRef?: string; // Reference to another section by name (e.g., "Chorus" to repeat)
}

export interface Song {
  id: string;
  title: string;
  artist?: string;
  rawLyrics: string;
  slides: Slide[]; // Auto-generated from rawLyrics
  createdAt: Date;
  updatedAt: Date;
}

export interface Setlist {
  id: string;
  name: string; // e.g., "Sunday Service Jan 12"
  songs: Song[];
  createdAt: Date;
  updatedAt: Date;
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
