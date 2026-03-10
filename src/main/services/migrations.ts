/**
 * Database migrations for OpenWorship
 * Handles FTS5 full-text search setup and other schema migrations
 */

import type Database from 'better-sqlite3';
import log from 'electron-log';

/**
 * Check if an FTS5 table exists
 */
function ftsTableExists(db: Database.Database, tableName: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(tableName) as { name: string } | undefined;
  return !!row;
}

/**
 * Create FTS5 tables and sync triggers for songs
 */
function migrateSongsFts(db: Database.Database): void {
  if (ftsTableExists(db, 'songs_fts')) {
    log.info('[Migrations] songs_fts already exists, skipping');
    return;
  }

  log.info('[Migrations] Creating songs_fts table and triggers');

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
      title,
      lyrics,
      content=songs,
      content_rowid=rowid
    );
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS songs_ai AFTER INSERT ON songs BEGIN
      INSERT INTO songs_fts(rowid, title, lyrics)
      VALUES (new.rowid, new.title, new.lyrics);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS songs_ad AFTER DELETE ON songs BEGIN
      INSERT INTO songs_fts(songs_fts, rowid, title, lyrics)
      VALUES ('delete', old.rowid, old.title, old.lyrics);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS songs_au AFTER UPDATE ON songs BEGIN
      INSERT INTO songs_fts(songs_fts, rowid, title, lyrics)
      VALUES ('delete', old.rowid, old.title, old.lyrics);
      INSERT INTO songs_fts(rowid, title, lyrics)
      VALUES (new.rowid, new.title, new.lyrics);
    END;
  `);

  // Populate FTS from existing data
  db.exec(`
    INSERT INTO songs_fts(rowid, title, lyrics)
    SELECT rowid, title, lyrics FROM songs;
  `);

  log.info('[Migrations] songs_fts created and populated');
}

/**
 * Create FTS5 tables and sync triggers for bible_verses
 */
function migrateBibleVersesFts(db: Database.Database): void {
  if (ftsTableExists(db, 'bible_verses_fts')) {
    log.info('[Migrations] bible_verses_fts already exists, skipping');
    return;
  }

  log.info('[Migrations] Creating bible_verses_fts table and triggers');

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS bible_verses_fts USING fts5(
      text,
      content=bible_verses,
      content_rowid=rowid
    );
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS bible_verses_ai AFTER INSERT ON bible_verses BEGIN
      INSERT INTO bible_verses_fts(rowid, text)
      VALUES (new.rowid, new.text);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS bible_verses_ad AFTER DELETE ON bible_verses BEGIN
      INSERT INTO bible_verses_fts(bible_verses_fts, rowid, text)
      VALUES ('delete', old.rowid, old.text);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS bible_verses_au AFTER UPDATE ON bible_verses BEGIN
      INSERT INTO bible_verses_fts(bible_verses_fts, rowid, text)
      VALUES ('delete', old.rowid, old.text);
      INSERT INTO bible_verses_fts(rowid, text)
      VALUES (new.rowid, new.text);
    END;
  `);

  // Populate FTS from existing data
  db.exec(`
    INSERT INTO bible_verses_fts(rowid, text)
    SELECT rowid, text FROM bible_verses;
  `);

  log.info('[Migrations] bible_verses_fts created and populated');
}

/**
 * Run all pending database migrations
 * Call this after database initialization, passing the db instance
 */
export function runMigrations(db: Database.Database): void {
  log.info('[Migrations] Running database migrations...');

  try {
    // Check that base tables exist before creating FTS
    const songsExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='songs'`,
      )
      .get();

    const bibleVersesExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='bible_verses'`,
      )
      .get();

    if (songsExists) {
      migrateSongsFts(db);
    } else {
      log.info('[Migrations] songs table not found, skipping songs_fts');
    }

    if (bibleVersesExists) {
      migrateBibleVersesFts(db);
    } else {
      log.info(
        '[Migrations] bible_verses table not found, skipping bible_verses_fts',
      );
    }

    log.info('[Migrations] All migrations complete');
  } catch (error) {
    log.error('[Migrations] FTS migration failed (non-fatal):', error);
    // Do NOT throw — FTS is optional, app works without it
  }
}
