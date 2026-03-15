/**
 * Export/Import types for OpenWorship
 */

export interface OpenWorshipFile {
  version: '1.0' | '1.1';
  type: 'song' | 'session' | 'library';
  exportedAt: string;
  appVersion: string;
  data: {
    songs?: ExportedSong[];
    sessions?: ExportedSession[];
  };
}

export interface ExportedSong {
  id: string;
  title: string;
  lyrics: string;
  categories: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Exported representation of a setlist item (any type).
 * Used in v1.1+ export format.
 */
export interface ExportedSessionItem {
  type: 'song' | 'bible' | 'announcement';
  position: number;
  // Song fields
  songId?: string;
  // Bible fields
  translationId?: string;
  translationName?: string;
  bookId?: string;
  bookName?: string;
  chapter?: number;
  startVerse?: number;
  endVerse?: number;
  displayMode?: string;
  // Announcement fields
  title?: string;
  content?: string;
  noteDisplayMode?: string;
  noteContentType?: string;
  imagePath?: string;
  overlayPosition?: string;
}

export interface ExportedSession {
  id: string;
  name: string;
  songIds: string[];
  /** Ordered list of all setlist items (v1.1+). Takes precedence over songIds. */
  items?: ExportedSessionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ImportPreview {
  file: OpenWorshipFile;
  songs: Array<{
    song: ExportedSong;
    exists: boolean;
    existingId?: string;
  }>;
  sessions: Array<{
    session: ExportedSession;
    exists: boolean;
    existingId?: string;
    missingSongs: string[];
  }>;
}

export interface ImportOptions {
  selectedSongIds: string[];
  selectedSessionIds: string[];
  conflictResolution: 'skip' | 'overwrite' | 'duplicate';
}

export interface ImportResult {
  success: boolean;
  importedSongs: number;
  importedSessions: number;
  skippedSongs: number;
  skippedSessions: number;
  errors: string[];
}
