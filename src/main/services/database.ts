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
import { runMigrations as runFtsMigrations } from './migrations';

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

// Safe JSON parse helper - returns fallback on parse failure
function safeJsonParse(jsonStr: string | null, fallback: any[] = []): any[] {
  try {
    return JSON.parse(jsonStr || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

// Database instance
let db: Database.Database | null = null;

// Get database path
const getDatabasePath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'songs.db');
};

// Initialize and set up a database connection at the given path
const setupDatabase = (dbPath: string): void => {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = ON');

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

    -- Bible translations table
    CREATE TABLE IF NOT EXISTS bible_translations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      language TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_bible_translations_language ON bible_translations(language);

    -- Bible books table
    CREATE TABLE IF NOT EXISTS bible_books (
      id TEXT PRIMARY KEY,
      translation_id TEXT NOT NULL,
      book_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      abbreviation TEXT,
      chapter_count INTEGER NOT NULL,
      FOREIGN KEY (translation_id) REFERENCES bible_translations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_bible_books_translation ON bible_books(translation_id);
    CREATE INDEX IF NOT EXISTS idx_bible_books_number ON bible_books(translation_id, book_number);

    -- Bible verses table
    CREATE TABLE IF NOT EXISTS bible_verses (
      id TEXT PRIMARY KEY,
      translation_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (translation_id) REFERENCES bible_translations(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES bible_books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_bible_verses_location ON bible_verses(translation_id, book_id, chapter, verse);
    CREATE INDEX IF NOT EXISTS idx_bible_verses_book ON bible_verses(book_id);

    -- Unified session items table (replaces session_songs for new content)
    CREATE TABLE IF NOT EXISTS session_items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('song', 'bible', 'announcement')),
      position INTEGER NOT NULL,
      -- Song-specific fields
      song_id TEXT,
      -- Bible-specific fields
      translation_id TEXT,
      translation_name TEXT,
      book_id TEXT,
      book_name TEXT,
      chapter INTEGER,
      start_verse INTEGER,
      end_verse INTEGER,
      display_mode TEXT,
      -- Announcement-specific fields
      title TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_session_items_session ON session_items(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_items_position ON session_items(session_id, position);
    CREATE INDEX IF NOT EXISTS idx_session_items_type ON session_items(item_type);

    -- Frames table for decorative borders
    CREATE TABLE IF NOT EXISTS frames (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('image', 'css')),
      image_path TEXT,
      slice_size INTEGER,
      border_width INTEGER,
      border_color TEXT,
      border_radius INTEGER,
      background_color TEXT,
      box_shadow TEXT,
      padding_top INTEGER,
      padding_right INTEGER,
      padding_bottom INTEGER,
      padding_left INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Run migrations
  runMigrations();

  // Run FTS5 migrations (full-text search)
  runFtsMigrations(db);
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

  try {
    setupDatabase(dbPath);
    log.info('[Database] Database initialized successfully');
  } catch (error) {
    log.error('[Database] Failed to initialize database:', error);

    // Try to recover by renaming corrupted DB and creating a fresh one
    try {
      if (db) {
        try {
          db.close();
        } catch {
          /* ignore close error */
        }
        db = null;
      }
      const corruptedPath = `${dbPath}.corrupted`;
      if (fs.existsSync(dbPath)) {
        fs.renameSync(dbPath, corruptedPath);
        log.info('[Database] Renamed corrupted database to:', corruptedPath);
      }
      // Also rename WAL/SHM files if they exist
      for (const suffix of ['-wal', '-shm']) {
        const walPath = dbPath + suffix;
        if (fs.existsSync(walPath)) {
          fs.renameSync(walPath, corruptedPath + suffix);
        }
      }
      setupDatabase(dbPath);
      log.info('[Database] Created fresh database after corruption recovery');
    } catch (recoveryError) {
      log.error('[Database] Recovery failed:', recoveryError);
      throw recoveryError;
    }
  }
};

// Run database migrations
const runMigrations = (): void => {
  if (!db) return;

  // Check if session_items migration has been done
  const hasSessionItems = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='session_items'",
    )
    .get();

  if (hasSessionItems) {
    // Check if we need to migrate session_songs data to session_items
    const sessionSongsCount = db
      .prepare('SELECT COUNT(*) as count FROM session_songs')
      .get() as { count: number };

    const sessionItemsCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM session_items WHERE item_type = 'song'",
      )
      .get() as { count: number };

    // Add note columns if missing (note feature migration)
    const hasNoteDisplayMode = db
      .prepare(
        "SELECT COUNT(*) as count FROM pragma_table_info('session_items') WHERE name='note_display_mode'",
      )
      .get() as { count: number };

    if (hasNoteDisplayMode.count === 0) {
      log.info('[Database] Adding note columns to session_items...');
      db.exec('ALTER TABLE session_items ADD COLUMN note_display_mode TEXT');
      db.exec('ALTER TABLE session_items ADD COLUMN note_content_type TEXT');
      db.exec('ALTER TABLE session_items ADD COLUMN image_path TEXT');
      db.exec('ALTER TABLE session_items ADD COLUMN overlay_position TEXT');
      log.info('[Database] Note columns added');
    }

    if (sessionSongsCount.count > 0 && sessionItemsCount.count === 0) {
      log.info('[Database] Migrating session_songs to session_items...');

      // Migrate session_songs to session_items
      const migrateStmt = db.prepare(`
        INSERT INTO session_items (id, session_id, item_type, position, song_id, created_at)
        SELECT
          lower(hex(randomblob(16))) as id,
          session_id,
          'song' as item_type,
          position,
          song_id,
          created_at
        FROM session_songs
      `);

      migrateStmt.run();
      log.info('[Database] Migration complete');
    }
  }
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
    categories: safeJsonParse(row.categories),
    tags: safeJsonParse(row.tags),
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
    categories: safeJsonParse(row.categories),
    tags: safeJsonParse(row.tags),
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
    categories: safeJsonParse(row.categories),
    tags: safeJsonParse(row.tags),
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
    const cats = safeJsonParse(row.categories) as string[];
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
    const tags = safeJsonParse(row.tags) as string[];
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
    categories: safeJsonParse(row.categories),
    tags: safeJsonParse(row.tags),
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
    categories: safeJsonParse(row.categories),
    tags: safeJsonParse(row.tags),
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

  // Simple SELECT instead of getSessionById (which does a heavy JOIN)
  const existingStmt = db.prepare(`
    SELECT id, name, created_at as createdAt, updated_at as updatedAt
    FROM sessions
    WHERE id = ?
  `);
  const existing = existingStmt.get(id) as DbSession | undefined;
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

  const posStmt = db.prepare(`
    SELECT COALESCE(MAX(position), -1) + 1 as nextPos
    FROM session_songs
    WHERE session_id = ?
  `);
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO session_songs (session_id, song_id, position)
    VALUES (?, ?, ?)
  `);
  const updateStmt = db.prepare(
    'UPDATE sessions SET updated_at = ? WHERE id = ?',
  );

  const addSongTx = db.transaction((sessId: string, sngId: string) => {
    const { nextPos } = posStmt.get(sessId) as { nextPos: number };
    const result = insertStmt.run(sessId, sngId, nextPos);
    if (result.changes > 0) {
      updateStmt.run(new Date().toISOString(), sessId);
      return true;
    }
    return false;
  });

  const added = addSongTx(sessionId, songId);
  if (added) {
    log.info('[Database] Added song to session:', songId, '->', sessionId);
  }
  return added;
};

// Remove song from session
export const removeSongFromSession = (
  sessionId: string,
  songId: string,
): boolean => {
  if (!db) throw new Error('Database not initialized');

  const deleteStmt = db.prepare(`
    DELETE FROM session_songs
    WHERE session_id = ? AND song_id = ?
  `);
  const updateStmt = db.prepare(
    'UPDATE sessions SET updated_at = ? WHERE id = ?',
  );

  const removeSongTx = db.transaction((sessId: string, sngId: string) => {
    const result = deleteStmt.run(sessId, sngId);
    if (result.changes > 0) {
      reorderSessionSongsAfterDelete(sessId);
      updateStmt.run(new Date().toISOString(), sessId);
      return true;
    }
    return false;
  });

  const removed = removeSongTx(sessionId, songId);
  if (removed) {
    log.info('[Database] Removed song from session:', songId, '<-', sessionId);
  }
  return removed;
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

// ============================================
// Bible Operations
// ============================================

// Bible translation type
export interface DbBibleTranslation {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Bible book type
export interface DbBibleBook {
  id: string;
  translationId: string;
  bookNumber: number;
  name: string;
  abbreviation?: string;
  chapterCount: number;
}

// Bible verse type
export interface DbBibleVerse {
  id: string;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
}

// Get all Bible translations
export const getAllBibleTranslations = (): DbBibleTranslation[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, name, abbreviation, language, description,
           created_at as createdAt, updated_at as updatedAt
    FROM bible_translations
    ORDER BY language, name
  `);

  return stmt.all() as DbBibleTranslation[];
};

// Get Bible translation by ID
export const getBibleTranslationById = (
  id: string,
): DbBibleTranslation | null => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, name, abbreviation, language, description,
           created_at as createdAt, updated_at as updatedAt
    FROM bible_translations
    WHERE id = ?
  `);

  return (stmt.get(id) as DbBibleTranslation) || null;
};

// Add Bible translation
export const addBibleTranslation = (translation: {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  description?: string;
}): DbBibleTranslation => {
  if (!db) throw new Error('Database not initialized');

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO bible_translations (id, name, abbreviation, language, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    translation.id,
    translation.name,
    translation.abbreviation,
    translation.language,
    translation.description || null,
    now,
    now,
  );

  log.info('[Database] Added Bible translation:', translation.name);

  return {
    ...translation,
    createdAt: now,
    updatedAt: now,
  };
};

// Delete Bible translation (cascades to books and verses)
export const deleteBibleTranslation = (id: string): boolean => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare('DELETE FROM bible_translations WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes > 0) {
    log.info('[Database] Deleted Bible translation:', id);
    return true;
  }
  return false;
};

// Get books for a translation
export const getBibleBooks = (translationId: string): DbBibleBook[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, translation_id as translationId, book_number as bookNumber,
           name, abbreviation, chapter_count as chapterCount
    FROM bible_books
    WHERE translation_id = ?
    ORDER BY book_number
  `);

  return stmt.all(translationId) as DbBibleBook[];
};

// Get book by ID
export const getBibleBookById = (id: string): DbBibleBook | null => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, translation_id as translationId, book_number as bookNumber,
           name, abbreviation, chapter_count as chapterCount
    FROM bible_books
    WHERE id = ?
  `);

  return (stmt.get(id) as DbBibleBook) || null;
};

// Add Bible book
export const addBibleBook = (book: DbBibleBook): void => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    INSERT INTO bible_books (id, translation_id, book_number, name, abbreviation, chapter_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    book.id,
    book.translationId,
    book.bookNumber,
    book.name,
    book.abbreviation || null,
    book.chapterCount,
  );
};

// Add multiple Bible books (batch)
export const addBibleBooksBatch = (books: DbBibleBook[]): void => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    INSERT INTO bible_books (id, translation_id, book_number, name, abbreviation, chapter_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const book of books) {
      stmt.run(
        book.id,
        book.translationId,
        book.bookNumber,
        book.name,
        book.abbreviation || null,
        book.chapterCount,
      );
    }
  });

  transaction();
};

// Get verses for a chapter
export const getBibleVerses = (
  bookId: string,
  chapter: number,
): DbBibleVerse[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, translation_id as translationId, book_id as bookId,
           chapter, verse, text
    FROM bible_verses
    WHERE book_id = ? AND chapter = ?
    ORDER BY verse
  `);

  return stmt.all(bookId, chapter) as DbBibleVerse[];
};

// Get verses in a range
export const getBibleVersesRange = (
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
): DbBibleVerse[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT id, translation_id as translationId, book_id as bookId,
           chapter, verse, text
    FROM bible_verses
    WHERE book_id = ? AND chapter = ? AND verse >= ? AND verse <= ?
    ORDER BY verse
  `);

  return stmt.all(bookId, chapter, startVerse, endVerse) as DbBibleVerse[];
};

// Get verse count for a chapter
export const getBibleVerseCount = (bookId: string, chapter: number): number => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM bible_verses
    WHERE book_id = ? AND chapter = ?
  `);

  const result = stmt.get(bookId, chapter) as { count: number };
  return result.count;
};

// Add Bible verse
export const addBibleVerse = (verse: DbBibleVerse): void => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    INSERT INTO bible_verses (id, translation_id, book_id, chapter, verse, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    verse.id,
    verse.translationId,
    verse.bookId,
    verse.chapter,
    verse.verse,
    verse.text,
  );
};

// Add multiple Bible verses (batch) - optimized for bulk import
export const addBibleVersesBatch = (verses: DbBibleVerse[]): void => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    INSERT INTO bible_verses (id, translation_id, book_id, chapter, verse, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const verse of verses) {
      stmt.run(
        verse.id,
        verse.translationId,
        verse.bookId,
        verse.chapter,
        verse.verse,
        verse.text,
      );
    }
  });

  transaction();
};

// Search Bible verses by text
export const searchBibleVerses = (
  translationId: string,
  query: string,
  limit: number = 100,
): DbBibleVerse[] => {
  if (!db) throw new Error('Database not initialized');

  const searchTerm = `%${query}%`;
  const stmt = db.prepare(`
    SELECT id, translation_id as translationId, book_id as bookId,
           chapter, verse, text
    FROM bible_verses
    WHERE translation_id = ? AND text LIKE ?
    LIMIT ?
  `);

  return stmt.all(translationId, searchTerm, limit) as DbBibleVerse[];
};

// ============================================
// Session Items Operations (Unified Setlist)
// ============================================

// Session item type
export interface DbSessionItem {
  id: string;
  sessionId: string;
  itemType: 'song' | 'bible' | 'announcement';
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
  // Note fields (announcement extensions)
  noteDisplayMode?: string;
  noteContentType?: string;
  imagePath?: string;
  overlayPosition?: string;
  createdAt: string;
}

// Get all items for a session
export const getSessionItems = (sessionId: string): DbSessionItem[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT
      id,
      session_id as sessionId,
      item_type as itemType,
      position,
      song_id as songId,
      translation_id as translationId,
      translation_name as translationName,
      book_id as bookId,
      book_name as bookName,
      chapter,
      start_verse as startVerse,
      end_verse as endVerse,
      display_mode as displayMode,
      title,
      content,
      note_display_mode as noteDisplayMode,
      note_content_type as noteContentType,
      image_path as imagePath,
      overlay_position as overlayPosition,
      created_at as createdAt
    FROM session_items
    WHERE session_id = ?
    ORDER BY position
  `);

  return stmt.all(sessionId) as DbSessionItem[];
};

// Add item to session
export const addSessionItem = (
  item: Omit<DbSessionItem, 'id' | 'position' | 'createdAt'>,
): DbSessionItem => {
  if (!db) throw new Error('Database not initialized');

  const posStmt = db.prepare(`
    SELECT COALESCE(MAX(position), -1) + 1 as nextPos
    FROM session_items
    WHERE session_id = ?
  `);
  const insertStmt = db.prepare(`
    INSERT INTO session_items (
      id, session_id, item_type, position, song_id,
      translation_id, translation_name, book_id, book_name,
      chapter, start_verse, end_verse, display_mode,
      title, content, note_display_mode, note_content_type,
      image_path, overlay_position, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStmt = db.prepare(
    'UPDATE sessions SET updated_at = ? WHERE id = ?',
  );

  const addItemTx = db.transaction(
    (itm: Omit<DbSessionItem, 'id' | 'position' | 'createdAt'>) => {
      const newId = uuidv4();
      const now = new Date().toISOString();
      const { nextPos } = posStmt.get(itm.sessionId) as { nextPos: number };

      insertStmt.run(
        newId,
        itm.sessionId,
        itm.itemType,
        nextPos,
        itm.songId || null,
        itm.translationId || null,
        itm.translationName || null,
        itm.bookId || null,
        itm.bookName || null,
        itm.chapter ?? null,
        itm.startVerse ?? null,
        itm.endVerse ?? null,
        itm.displayMode || null,
        itm.title || null,
        itm.content || null,
        itm.noteDisplayMode || null,
        itm.noteContentType || null,
        itm.imagePath || null,
        itm.overlayPosition || null,
        now,
      );

      updateStmt.run(now, itm.sessionId);

      return { id: newId, position: nextPos, createdAt: now };
    },
  );

  const result = addItemTx(item);

  log.info(
    '[Database] Added session item:',
    item.itemType,
    '->',
    item.sessionId,
  );

  return {
    ...result,
    ...item,
  };
};

// Update session item
export const updateSessionItem = (
  id: string,
  updates: Partial<Omit<DbSessionItem, 'id' | 'sessionId' | 'createdAt'>>,
): DbSessionItem | null => {
  if (!db) throw new Error('Database not initialized');

  // Get existing item
  const getStmt = db.prepare(`
    SELECT
      id,
      session_id as sessionId,
      item_type as itemType,
      position,
      song_id as songId,
      translation_id as translationId,
      translation_name as translationName,
      book_id as bookId,
      book_name as bookName,
      chapter,
      start_verse as startVerse,
      end_verse as endVerse,
      display_mode as displayMode,
      title,
      content,
      note_display_mode as noteDisplayMode,
      note_content_type as noteContentType,
      image_path as imagePath,
      overlay_position as overlayPosition,
      created_at as createdAt
    FROM session_items
    WHERE id = ?
  `);
  const existing = getStmt.get(id) as DbSessionItem | undefined;
  if (!existing) return null;

  const updated: DbSessionItem = {
    ...existing,
    ...updates,
  };

  const stmt = db.prepare(`
    UPDATE session_items SET
      item_type = ?,
      position = ?,
      song_id = ?,
      translation_id = ?,
      translation_name = ?,
      book_id = ?,
      book_name = ?,
      chapter = ?,
      start_verse = ?,
      end_verse = ?,
      display_mode = ?,
      title = ?,
      content = ?,
      note_display_mode = ?,
      note_content_type = ?,
      image_path = ?,
      overlay_position = ?
    WHERE id = ?
  `);

  stmt.run(
    updated.itemType,
    updated.position,
    updated.songId || null,
    updated.translationId || null,
    updated.translationName || null,
    updated.bookId || null,
    updated.bookName || null,
    updated.chapter ?? null,
    updated.startVerse ?? null,
    updated.endVerse ?? null,
    updated.displayMode || null,
    updated.title || null,
    updated.content || null,
    updated.noteDisplayMode || null,
    updated.noteContentType || null,
    updated.imagePath || null,
    updated.overlayPosition || null,
    id,
  );

  // Update session timestamp
  const updateStmt = db.prepare(
    'UPDATE sessions SET updated_at = ? WHERE id = ?',
  );
  updateStmt.run(new Date().toISOString(), existing.sessionId);

  return updated;
};

// Delete session item
export const deleteSessionItem = (id: string): boolean => {
  if (!db) throw new Error('Database not initialized');

  const getStmt = db.prepare(
    'SELECT session_id FROM session_items WHERE id = ?',
  );
  const deleteStmt = db.prepare('DELETE FROM session_items WHERE id = ?');
  const updateStmt = db.prepare(
    'UPDATE sessions SET updated_at = ? WHERE id = ?',
  );

  const deleteItemTx = db.transaction((itemId: string) => {
    const item = getStmt.get(itemId) as { session_id: string } | undefined;
    const result = deleteStmt.run(itemId);

    if (result.changes > 0 && item) {
      reorderSessionItemsAfterDelete(item.session_id);
      updateStmt.run(new Date().toISOString(), item.session_id);
      return true;
    }
    return false;
  });

  const deleted = deleteItemTx(id);
  if (deleted) {
    log.info('[Database] Deleted session item:', id);
  }
  return deleted;
};

// Helper to reorder items after deletion
const reorderSessionItemsAfterDelete = (sessionId: string): void => {
  if (!db) return;

  const items = db
    .prepare(
      'SELECT id FROM session_items WHERE session_id = ? ORDER BY position',
    )
    .all(sessionId) as { id: string }[];

  const updateStmt = db.prepare(
    'UPDATE session_items SET position = ? WHERE id = ?',
  );

  items.forEach((item, index) => {
    updateStmt.run(index, item.id);
  });
};

// Reorder session items
export const reorderSessionItems = (
  sessionId: string,
  itemIds: string[],
): boolean => {
  if (!db) throw new Error('Database not initialized');

  const updateStmt = db.prepare(
    'UPDATE session_items SET position = ? WHERE id = ?',
  );

  const transaction = db.transaction(() => {
    itemIds.forEach((itemId, index) => {
      updateStmt.run(index, itemId);
    });
  });

  try {
    transaction();
    // Update session timestamp
    const updateTimeStmt = db.prepare(
      'UPDATE sessions SET updated_at = ? WHERE id = ?',
    );
    updateTimeStmt.run(new Date().toISOString(), sessionId);
    log.info('[Database] Reordered session items:', sessionId);
    return true;
  } catch (error) {
    log.error('[Database] Failed to reorder session items:', error);
    return false;
  }
};

// ============================================
// Frame Operations
// ============================================

// Frame type
export interface DbFrame {
  id: string;
  name: string;
  type: 'image' | 'css';
  imagePath?: string;
  sliceSize?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  backgroundColor?: string;
  boxShadow?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  createdAt: string;
  updatedAt: string;
}

// Get all frames
export const getAllFrames = (): DbFrame[] => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT
      id, name, type,
      image_path as imagePath,
      slice_size as sliceSize,
      border_width as borderWidth,
      border_color as borderColor,
      border_radius as borderRadius,
      background_color as backgroundColor,
      box_shadow as boxShadow,
      padding_top as paddingTop,
      padding_right as paddingRight,
      padding_bottom as paddingBottom,
      padding_left as paddingLeft,
      created_at as createdAt,
      updated_at as updatedAt
    FROM frames
    ORDER BY name
  `);

  return stmt.all() as DbFrame[];
};

// Get frame by ID
export const getFrameById = (id: string): DbFrame | null => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    SELECT
      id, name, type,
      image_path as imagePath,
      slice_size as sliceSize,
      border_width as borderWidth,
      border_color as borderColor,
      border_radius as borderRadius,
      background_color as backgroundColor,
      box_shadow as boxShadow,
      padding_top as paddingTop,
      padding_right as paddingRight,
      padding_bottom as paddingBottom,
      padding_left as paddingLeft,
      created_at as createdAt,
      updated_at as updatedAt
    FROM frames
    WHERE id = ?
  `);

  return (stmt.get(id) as DbFrame) || null;
};

// Add frame
export const addFrame = (
  frame: Omit<DbFrame, 'id' | 'createdAt' | 'updatedAt'>,
): DbFrame => {
  if (!db) throw new Error('Database not initialized');

  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO frames (
      id, name, type, image_path, slice_size,
      border_width, border_color, border_radius, background_color, box_shadow,
      padding_top, padding_right, padding_bottom, padding_left,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    frame.name,
    frame.type,
    frame.imagePath || null,
    frame.sliceSize ?? null,
    frame.borderWidth ?? null,
    frame.borderColor || null,
    frame.borderRadius ?? null,
    frame.backgroundColor || null,
    frame.boxShadow || null,
    frame.paddingTop ?? null,
    frame.paddingRight ?? null,
    frame.paddingBottom ?? null,
    frame.paddingLeft ?? null,
    now,
    now,
  );

  log.info('[Database] Added frame:', frame.name);

  return {
    id,
    ...frame,
    createdAt: now,
    updatedAt: now,
  };
};

// Update frame
export const updateFrame = (
  id: string,
  updates: Partial<Omit<DbFrame, 'id' | 'createdAt' | 'updatedAt'>>,
): DbFrame | null => {
  if (!db) throw new Error('Database not initialized');

  const existing = getFrameById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated = { ...existing, ...updates, updatedAt: now };

  const stmt = db.prepare(`
    UPDATE frames SET
      name = ?, type = ?, image_path = ?, slice_size = ?,
      border_width = ?, border_color = ?, border_radius = ?,
      background_color = ?, box_shadow = ?,
      padding_top = ?, padding_right = ?, padding_bottom = ?, padding_left = ?,
      updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    updated.name,
    updated.type,
    updated.imagePath || null,
    updated.sliceSize ?? null,
    updated.borderWidth ?? null,
    updated.borderColor || null,
    updated.borderRadius ?? null,
    updated.backgroundColor || null,
    updated.boxShadow || null,
    updated.paddingTop ?? null,
    updated.paddingRight ?? null,
    updated.paddingBottom ?? null,
    updated.paddingLeft ?? null,
    now,
    id,
  );

  log.info('[Database] Updated frame:', id);

  return updated;
};

// Delete frame
export const deleteFrame = (id: string): boolean => {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare('DELETE FROM frames WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes > 0) {
    log.info('[Database] Deleted frame:', id);
    return true;
  }
  return false;
};

// Get raw database instance (for dev tools)
export const getDb = (): Database.Database | null => db;

// Export database service
export const databaseService = {
  // Database lifecycle
  init: initDatabase,
  close: closeDatabase,
  getDatabasePath,
  getDb,

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

  // Bible operations
  getAllBibleTranslations,
  getBibleTranslationById,
  addBibleTranslation,
  deleteBibleTranslation,
  getBibleBooks,
  getBibleBookById,
  addBibleBook,
  addBibleBooksBatch,
  getBibleVerses,
  getBibleVersesRange,
  getBibleVerseCount,
  addBibleVerse,
  addBibleVersesBatch,
  searchBibleVerses,

  // Session items operations (unified setlist)
  getSessionItems,
  addSessionItem,
  updateSessionItem,
  deleteSessionItem,
  reorderSessionItems,

  // Frame operations
  getAllFrames,
  getFrameById,
  addFrame,
  updateFrame,
  deleteFrame,
};
