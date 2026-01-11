/**
 * Library and session database types
 * Used by both main and renderer processes
 */

export interface LibrarySong {
  id: string;
  title: string;
  lyrics: string;
  categories: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LibrarySongInput {
  title: string;
  lyrics: string;
  categories?: string[];
  tags?: string[];
}

export interface DbSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbSessionWithSongs extends DbSession {
  songs: LibrarySong[];
}
