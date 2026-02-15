/**
 * Export/Import types for OpenWorship
 */

export interface OpenWorshipFile {
  version: '1.0';
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

export interface ExportedSession {
  id: string;
  name: string;
  songIds: string[];
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
