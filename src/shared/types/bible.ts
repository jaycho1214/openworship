/**
 * Bible data structures for OpenWorship
 * Used by both main and renderer processes
 */

/**
 * Bible translation metadata
 */
export interface BibleTranslation {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Bible book information
 */
export interface BibleBook {
  id: string;
  translationId: string;
  bookNumber: number; // 1-66
  name: string;
  abbreviation?: string;
  chapterCount: number;
}

/**
 * Individual Bible verse
 */
export interface BibleVerse {
  id: string;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
}

/**
 * Bible verse reference (for display and selection)
 */
export interface BibleReference {
  translationId: string;
  translationName: string;
  bookId: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
}

/**
 * Bible import JSON format
 * This is the expected format for importing Bible translations
 */
export interface BibleImportData {
  name: string;
  abbreviation: string;
  language: string;
  description?: string;
  books: BibleImportBook[];
}

export interface BibleImportBook {
  name: string;
  abbreviation?: string;
  chapters: BibleImportChapter[];
}

export interface BibleImportChapter {
  chapter: number;
  verses: BibleImportVerse[];
}

export interface BibleImportVerse {
  verse: number;
  text: string;
}

/**
 * Bible verse display options
 */
export type BibleDisplayMode = 'one-per-slide' | 'range-on-slide';

/**
 * Bible verse selection for setlist
 */
export interface BibleVerseSelection {
  translationId: string;
  translationName: string;
  bookId: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  displayMode: BibleDisplayMode;
}

/**
 * Built-in Bible translations available for download
 */
export interface BibleDownloadInfo {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  description: string;
  downloadUrl: string;
  fileSize: string;
  isPublicDomain: boolean;
}

/**
 * Bible import progress event
 */
export interface BibleImportProgress {
  stage: 'reading' | 'parsing' | 'storing' | 'indexing' | 'complete';
  progress: number; // 0-100
  message?: string;
}
