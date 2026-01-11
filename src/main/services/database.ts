/**
 * Database Service for OpenWorship Song Library
 * Uses better-sqlite3 for SQLite operations
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { v4 as uuidv4 } from 'uuid';

// Song type definition
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

// Session type definition
export interface DbSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbSessionWithSongs extends DbSession {
  songs: LibrarySong[];
}

export interface DbSessionInput {
  name: string;
}

// Database instance
let db: Database.Database | null = null;

// Get database path
const getDatabasePath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'songs.db');
};

// Initialize database
export const initDatabase = (): void => {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  log.info('[Database] Initializing database at:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      lyrics TEXT NOT NULL,
      categories TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
    CREATE INDEX IF NOT EXISTS idx_songs_updated ON songs(updated_at DESC);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);

    CREATE TABLE IF NOT EXISTS session_songs (
      session_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, song_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_session_songs_session ON session_songs(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_songs_position ON session_songs(session_id, position);
  `);

  log.info('[Database] Database initialized successfully');
};

// Close database
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
    log.info('[Database] Database closed');
  }
};

// Get all songs
export const getAllSongs = (): LibrarySong[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, title, lyrics, categories, tags, created_at as createdAt, updated_at as updatedAt
    FROM songs
    ORDER BY updated_at DESC
  `);

  const rows = stmt.all() as any[];
  return rows.map((row) => ({
    ...row,
    categories: JSON.parse(row.categories || '[]'),
    tags: JSON.parse(row.tags || '[]'),
  }));
};

// Get song by ID
export const getSongById = (id: string): LibrarySong | null => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, title, lyrics, categories, tags, created_at as createdAt, updated_at as updatedAt
    FROM songs
    WHERE id = ?
  `);

  const row = stmt.get(id) as any;
  if (!row) return null;

  return {
    ...row,
    categories: JSON.parse(row.categories || '[]'),
    tags: JSON.parse(row.tags || '[]'),
  };
};

// Search songs
export const searchSongs = (query: string): LibrarySong[] => {
  if (!db) throw new Error('Database not initialized');

  const searchTerm = `%${query}%`;
  const stmt = db.prepare(`
    SELECT id, title, lyrics, categories, tags, created_at as createdAt, updated_at as updatedAt
    FROM songs
    WHERE title LIKE ? OR lyrics LIKE ? OR categories LIKE ? OR tags LIKE ?
    ORDER BY updated_at DESC
  `);

  const rows = stmt.all(
    searchTerm,
    searchTerm,
    searchTerm,
    searchTerm,
  ) as any[];
  return rows.map((row) => ({
    ...row,
    categories: JSON.parse(row.categories || '[]'),
    tags: JSON.parse(row.tags || '[]'),
  }));
};

// Add song
export const addSong = (song: LibrarySongInput): LibrarySong => {
  if (!db) throw new Error('Database not initialized');

  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO songs (id, title, lyrics, categories, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    song.title,
    song.lyrics,
    JSON.stringify(song.categories || []),
    JSON.stringify(song.tags || []),
    now,
    now,
  );

  log.info('[Database] Added song:', song.title);

  return {
    id,
    title: song.title,
    lyrics: song.lyrics,
    categories: song.categories || [],
    tags: song.tags || [],
    createdAt: now,
    updatedAt: now,
  };
};

// Update song
export const updateSong = (
  id: string,
  updates: Partial<LibrarySongInput>,
): LibrarySong | null => {
  if (!db) throw new Error('Database not initialized');

  const existing = getSongById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated = {
    title: updates.title ?? existing.title,
    lyrics: updates.lyrics ?? existing.lyrics,
    categories: updates.categories ?? existing.categories,
    tags: updates.tags ?? existing.tags,
  };

  const stmt = db.prepare(`
    UPDATE songs
    SET title = ?, lyrics = ?, categories = ?, tags = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    updated.title,
    updated.lyrics,
    JSON.stringify(updated.categories),
    JSON.stringify(updated.tags),
    now,
    id,
  );

  log.info('[Database] Updated song:', id);

  return {
    id,
    ...updated,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
};

// Delete song
export const deleteSong = (id: string): boolean => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare('DELETE FROM songs WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes > 0) {
    log.info('[Database] Deleted song:', id);
    return true;
  }
  return false;
};

// Delete multiple songs
export const deleteSongs = (ids: string[]): number => {
  if (!db) throw new Error('Database not initialized');

  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM songs WHERE id IN (${placeholders})`);
  const result = stmt.run(...ids);

  log.info('[Database] Deleted songs:', result.changes);
  return result.changes;
};

// Get all unique categories
export const getAllCategories = (): string[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare('SELECT DISTINCT categories FROM songs');
  const rows = stmt.all() as { categories: string }[];

  const categoriesSet = new Set<string>();
  rows.forEach((row) => {
    const cats = JSON.parse(row.categories || '[]') as string[];
    cats.forEach((cat) => categoriesSet.add(cat));
  });

  return Array.from(categoriesSet).sort();
};

// Get all unique tags
export const getAllTags = (): string[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare('SELECT DISTINCT tags FROM songs');
  const rows = stmt.all() as { tags: string }[];

  const tagsSet = new Set<string>();
  rows.forEach((row) => {
    const tags = JSON.parse(row.tags || '[]') as string[];
    tags.forEach((tag) => tagsSet.add(tag));
  });

  return Array.from(tagsSet).sort();
};

// Get songs count
export const getSongsCount = (): number => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare('SELECT COUNT(*) as count FROM songs');
  const result = stmt.get() as { count: number };
  return result.count;
};

// Find song by exact title (case-insensitive)
export const findSongByTitle = (title: string): LibrarySong | null => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, title, lyrics, categories, tags, created_at as createdAt, updated_at as updatedAt
    FROM songs
    WHERE LOWER(title) = LOWER(?)
    LIMIT 1
  `);

  const row = stmt.get(title) as any;
  if (!row) return null;

  return {
    ...row,
    categories: JSON.parse(row.categories || '[]'),
    tags: JSON.parse(row.tags || '[]'),
  };
};

// ============================================
// Session Operations
// ============================================

// Get all sessions
export const getAllSessions = (): DbSession[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, name, created_at as createdAt, updated_at as updatedAt
    FROM sessions
    ORDER BY updated_at DESC
  `);

  return stmt.all() as DbSession[];
};

// Get session by ID with songs
export const getSessionById = (id: string): DbSessionWithSongs | null => {
  if (!db) throw new Error('Database not initialized');

  const sessionStmt = db.prepare(`
    SELECT id, name, created_at as createdAt, updated_at as updatedAt
    FROM sessions
    WHERE id = ?
  `);

  const session = sessionStmt.get(id) as DbSession | undefined;
  if (!session) return null;

  // Get songs for this session in order
  const songsStmt = db.prepare(`
    SELECT s.id, s.title, s.lyrics, s.categories, s.tags,
           s.created_at as createdAt, s.updated_at as updatedAt
    FROM songs s
    INNER JOIN session_songs ss ON s.id = ss.song_id
    WHERE ss.session_id = ?
    ORDER BY ss.position ASC
  `);

  const rows = songsStmt.all(id) as any[];
  const songs = rows.map((row) => ({
    ...row,
    categories: JSON.parse(row.categories || '[]'),
    tags: JSON.parse(row.tags || '[]'),
  }));

  return { ...session, songs };
};

// Create session
export const createSession = (input: DbSessionInput): DbSession => {
  if (!db) throw new Error('Database not initialized');

  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(id, input.name, now, now);

  log.info('[Database] Created session:', input.name);

  return {
    id,
    name: input.name,
    createdAt: now,
    updatedAt: now,
  };
};

// Update session
export const updateSession = (
  id: string,
  updates: Partial<DbSessionInput>,
): DbSession | null => {
  if (!db) throw new Error('Database not initialized');

  const existing = getSessionById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const name = updates.name ?? existing.name;

  const stmt = db.prepare(`
    UPDATE sessions
    SET name = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(name, now, id);

  log.info('[Database] Updated session:', id);

  return {
    id,
    name,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
};

// Delete session
export const deleteSession = (id: string): boolean => {
  if (!db) throw new Error('Database not initialized');

  // Delete session (cascade will remove session_songs entries)
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes > 0) {
    log.info('[Database] Deleted session:', id);
    return true;
  }
  return false;
};

// Add song to session
export const addSongToSession = (
  sessionId: string,
  songId: string,
): boolean => {
  if (!db) throw new Error('Database not initialized');

  // Get next position
  const posStmt = db.prepare(`
    SELECT COALESCE(MAX(position), -1) + 1 as nextPos
    FROM session_songs
    WHERE session_id = ?
  `);
  const { nextPos } = posStmt.get(sessionId) as { nextPos: number };

  // Insert song
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO session_songs (session_id, song_id, position)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(sessionId, songId, nextPos);

  // Update session timestamp
  if (result.changes > 0) {
    const updateStmt = db.prepare(
      'UPDATE sessions SET updated_at = ? WHERE id = ?',
    );
    updateStmt.run(new Date().toISOString(), sessionId);
    log.info('[Database] Added song to session:', songId, '->', sessionId);
    return true;
  }
  return false;
};

// Remove song from session
export const removeSongFromSession = (
  sessionId: string,
  songId: string,
): boolean => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    DELETE FROM session_songs
    WHERE session_id = ? AND song_id = ?
  `);
  const result = stmt.run(sessionId, songId);

  if (result.changes > 0) {
    // Reorder remaining songs
    reorderSessionSongsAfterDelete(sessionId);
    // Update session timestamp
    const updateStmt = db.prepare(
      'UPDATE sessions SET updated_at = ? WHERE id = ?',
    );
    updateStmt.run(new Date().toISOString(), sessionId);
    log.info('[Database] Removed song from session:', songId, '<-', sessionId);
    return true;
  }
  return false;
};

// Helper to reorder songs after deletion
const reorderSessionSongsAfterDelete = (sessionId: string): void => {
  if (!db) return;

  const songs = db
    .prepare(
      `
    SELECT song_id FROM session_songs
    WHERE session_id = ?
    ORDER BY position ASC
  `,
    )
    .all(sessionId) as { song_id: string }[];

  const updateStmt = db.prepare(`
    UPDATE session_songs SET position = ?
    WHERE session_id = ? AND song_id = ?
  `);

  songs.forEach((song, index) => {
    updateStmt.run(index, sessionId, song.song_id);
  });
};

// Reorder songs in session
export const reorderSessionSongs = (
  sessionId: string,
  songIds: string[],
): boolean => {
  if (!db) throw new Error('Database not initialized');

  const updateStmt = db.prepare(`
    UPDATE session_songs SET position = ?
    WHERE session_id = ? AND song_id = ?
  `);

  const transaction = db.transaction(() => {
    songIds.forEach((songId, index) => {
      updateStmt.run(index, sessionId, songId);
    });
  });

  try {
    transaction();
    // Update session timestamp
    const updateTimeStmt = db.prepare(
      'UPDATE sessions SET updated_at = ? WHERE id = ?',
    );
    updateTimeStmt.run(new Date().toISOString(), sessionId);
    log.info('[Database] Reordered songs in session:', sessionId);
    return true;
  } catch (error) {
    log.error('[Database] Failed to reorder songs:', error);
    return false;
  }
};

// Get sessions count
export const getSessionsCount = (): number => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare('SELECT COUNT(*) as count FROM sessions');
  const result = stmt.get() as { count: number };
  return result.count;
};

// Export database service
export const databaseService = {
  // Database lifecycle
  init: initDatabase,
  close: closeDatabase,
  getDatabasePath,

  // Song operations
  getAllSongs,
  getSongById,
  searchSongs,
  addSong,
  updateSong,
  deleteSong,
  deleteSongs,
  getAllCategories,
  getAllTags,
  getSongsCount,
  findSongByTitle,

  // Session operations
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  addSongToSession,
  removeSongFromSession,
  reorderSessionSongs,
  getSessionsCount,
};
