/**
 * Comprehensive tests for ExportService
 * Tests export (song, session, library), import preview/parse, and import execution
 * with all conflict resolution strategies and format versions.
 */

/* eslint-disable import/first */

// ── Mocks ───────────────────────────────────────────────────────────────

jest.mock('electron', () => ({
  app: { getVersion: () => '1.0.0-test' },
}));

jest.mock('electron-log', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  __esModule: true,
}));

// Build a mock databaseService that we can control per-test
const mockDb = {
  getSongById: jest.fn(),
  getAllSongs: jest.fn(),
  addSong: jest.fn(),
  updateSong: jest.fn(),
  getSessionById: jest.fn(),
  getAllSessions: jest.fn(),
  createSession: jest.fn(),
  deleteSession: jest.fn(),
  getSessionItems: jest.fn(),
  addSessionItem: jest.fn(),
  getDb: jest.fn(),
};

jest.mock('../../main/services/database', () => ({
  databaseService: mockDb,
}));

import {
  exportSong,
  exportSession,
  exportLibrary,
  parseImportFile,
  importSelected,
} from '../../main/services/ExportService';
import type {
  ImportPreview,
  ImportOptions,
  ExportedSong,
  ExportedSession,
  OpenWorshipFile,
} from '../../shared/types';

// ── Helpers ─────────────────────────────────────────────────────────────

function makeSong(overrides: Partial<ExportedSong> = {}): ExportedSong {
  return {
    id: 'song-1',
    title: 'Amazing Grace',
    lyrics: 'Amazing grace how sweet the sound',
    categories: ['Hymn'],
    tags: ['classic'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDbSong(overrides: Record<string, unknown> = {}) {
  return {
    id: 'song-1',
    title: 'Amazing Grace',
    lyrics: 'Amazing grace how sweet the sound',
    categories: ['Hymn'],
    tags: ['classic'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDbSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    name: 'Sunday Service',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDbSessionItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    sessionId: 'session-1',
    itemType: 'song',
    position: 0,
    songId: 'song-1',
    translationId: null,
    translationName: null,
    bookId: null,
    bookName: null,
    chapter: null,
    startVerse: null,
    endVerse: null,
    displayMode: null,
    title: null,
    content: null,
    noteDisplayMode: null,
    noteContentType: null,
    imagePath: null,
    overlayPosition: null,
    ...overrides,
  };
}

// ── Setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════
// exportSong
// ═══════════════════════════════════════════════════════════════════════

describe('exportSong', () => {
  it('exports a song with correct structure', () => {
    mockDb.getSongById.mockReturnValue(makeDbSong());

    const result = exportSong('song-1');

    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.0');
    expect(result!.type).toBe('song');
    expect(result!.appVersion).toBe('1.0.0-test');
    expect(result!.exportedAt).toBeTruthy();
    expect(result!.data.songs).toHaveLength(1);
    expect(result!.data.songs![0].title).toBe('Amazing Grace');
    expect(result!.data.songs![0].lyrics).toBe(
      'Amazing grace how sweet the sound',
    );
    expect(result!.data.songs![0].categories).toEqual(['Hymn']);
    expect(result!.data.songs![0].tags).toEqual(['classic']);
  });

  it('returns null when song not found', () => {
    mockDb.getSongById.mockReturnValue(null);
    expect(exportSong('nonexistent')).toBeNull();
  });

  it('returns null on database error', () => {
    mockDb.getSongById.mockImplementation(() => {
      throw new Error('DB error');
    });
    expect(exportSong('song-1')).toBeNull();
  });

  it('handles song with empty categories and tags', () => {
    mockDb.getSongById.mockReturnValue(
      makeDbSong({ categories: null, tags: null }),
    );

    const result = exportSong('song-1');
    expect(result!.data.songs![0].categories).toEqual([]);
    expect(result!.data.songs![0].tags).toEqual([]);
  });

  it('exports ISO timestamp for exportedAt', () => {
    mockDb.getSongById.mockReturnValue(makeDbSong());
    const result = exportSong('song-1');
    // Should be a valid ISO string
    expect(() => new Date(result!.exportedAt)).not.toThrow();
    expect(new Date(result!.exportedAt).toISOString()).toBe(result!.exportedAt);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// exportSession
// ═══════════════════════════════════════════════════════════════════════

describe('exportSession', () => {
  it('exports a session with song items', () => {
    mockDb.getSessionById.mockReturnValue(makeDbSession());
    mockDb.getSessionItems.mockReturnValue([
      makeDbSessionItem({ position: 0, songId: 'song-1' }),
      makeDbSessionItem({
        id: 'item-2',
        position: 1,
        songId: 'song-2',
        itemType: 'song',
      }),
    ]);
    mockDb.getSongById
      .mockReturnValueOnce(makeDbSong({ id: 'song-1', title: 'Song A' }))
      .mockReturnValueOnce(
        makeDbSong({ id: 'song-2', title: 'Song B', lyrics: 'B lyrics' }),
      );

    const result = exportSession('session-1');

    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.1');
    expect(result!.type).toBe('session');
    expect(result!.data.songs).toHaveLength(2);
    expect(result!.data.sessions).toHaveLength(1);
    expect(result!.data.sessions![0].name).toBe('Sunday Service');
    expect(result!.data.sessions![0].songIds).toEqual(['song-1', 'song-2']);
    expect(result!.data.sessions![0].items).toHaveLength(2);
    expect(result!.data.sessions![0].items![0].type).toBe('song');
    expect(result!.data.sessions![0].items![0].songId).toBe('song-1');
  });

  it('exports session with mixed item types (song, bible, announcement)', () => {
    mockDb.getSessionById.mockReturnValue(makeDbSession());
    mockDb.getSessionItems.mockReturnValue([
      makeDbSessionItem({ position: 0, itemType: 'song', songId: 'song-1' }),
      makeDbSessionItem({
        id: 'item-2',
        position: 1,
        itemType: 'bible',
        songId: null,
        translationId: 'kjv',
        translationName: 'KJV',
        bookId: 'GEN',
        bookName: 'Genesis',
        chapter: 1,
        startVerse: 1,
        endVerse: 3,
        displayMode: 'verse',
      }),
      makeDbSessionItem({
        id: 'item-3',
        position: 2,
        itemType: 'announcement',
        songId: null,
        title: 'Welcome',
        content: 'Welcome to our service',
      }),
    ]);
    mockDb.getSongById.mockReturnValue(makeDbSong());

    const result = exportSession('session-1');

    expect(result!.data.sessions![0].items).toHaveLength(3);
    expect(result!.data.sessions![0].items![0].type).toBe('song');
    expect(result!.data.sessions![0].items![1].type).toBe('bible');
    expect(result!.data.sessions![0].items![1].bookName).toBe('Genesis');
    expect(result!.data.sessions![0].items![1].chapter).toBe(1);
    expect(result!.data.sessions![0].items![2].type).toBe('announcement');
    expect(result!.data.sessions![0].items![2].title).toBe('Welcome');
  });

  it('returns null when session not found', () => {
    mockDb.getSessionById.mockReturnValue(null);
    expect(exportSession('nonexistent')).toBeNull();
  });

  it('returns null on database error', () => {
    mockDb.getSessionById.mockImplementation(() => {
      throw new Error('DB error');
    });
    expect(exportSession('session-1')).toBeNull();
  });

  it('exports session with empty items', () => {
    mockDb.getSessionById.mockReturnValue(makeDbSession());
    mockDb.getSessionItems.mockReturnValue([]);

    const result = exportSession('session-1');

    expect(result!.data.songs).toEqual([]);
    expect(result!.data.sessions![0].songIds).toEqual([]);
    expect(result!.data.sessions![0].items).toEqual([]);
  });

  it('skips songs that are not found in database', () => {
    mockDb.getSessionById.mockReturnValue(makeDbSession());
    mockDb.getSessionItems.mockReturnValue([
      makeDbSessionItem({ position: 0, songId: 'song-1' }),
      makeDbSessionItem({
        id: 'item-2',
        position: 1,
        songId: 'song-missing',
      }),
    ]);
    // First song found, second returns null
    mockDb.getSongById
      .mockReturnValueOnce(makeDbSong())
      .mockReturnValueOnce(null);

    const result = exportSession('session-1');
    // Only the found song is exported
    expect(result!.data.songs).toHaveLength(1);
    expect(result!.data.songs![0].id).toBe('song-1');
    // songIds is derived from exported songs (filtered), so only found songs appear
    expect(result!.data.sessions![0].songIds).toEqual(['song-1']);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// exportLibrary
// ═══════════════════════════════════════════════════════════════════════

describe('exportLibrary', () => {
  it('exports all songs and sessions', () => {
    mockDb.getAllSongs.mockReturnValue([
      makeDbSong({ id: 'song-1', title: 'Song A' }),
      makeDbSong({ id: 'song-2', title: 'Song B' }),
    ]);
    mockDb.getAllSessions.mockReturnValue([makeDbSession()]);
    mockDb.getSessionItems.mockReturnValue([
      makeDbSessionItem({ songId: 'song-1' }),
    ]);

    const result = exportLibrary();

    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.1');
    expect(result!.type).toBe('library');
    expect(result!.data.songs).toHaveLength(2);
    expect(result!.data.sessions).toHaveLength(1);
    expect(result!.data.sessions![0].items).toHaveLength(1);
  });

  it('exports empty library', () => {
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);

    const result = exportLibrary();

    expect(result!.data.songs).toEqual([]);
    expect(result!.data.sessions).toEqual([]);
  });

  it('returns null on error', () => {
    mockDb.getAllSongs.mockImplementation(() => {
      throw new Error('DB error');
    });
    expect(exportLibrary()).toBeNull();
  });

  it('includes bible and announcement items in sessions', () => {
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([makeDbSession()]);
    mockDb.getSessionItems.mockReturnValue([
      makeDbSessionItem({
        itemType: 'bible',
        songId: null,
        bookName: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
      }),
      makeDbSessionItem({
        id: 'item-2',
        position: 1,
        itemType: 'announcement',
        songId: null,
        title: 'Notice',
        content: 'Church picnic Saturday',
      }),
    ]);

    const result = exportLibrary();

    expect(result!.data.sessions![0].items).toHaveLength(2);
    expect(result!.data.sessions![0].items![0].type).toBe('bible');
    expect(result!.data.sessions![0].items![0].bookName).toBe('John');
    expect(result!.data.sessions![0].items![1].type).toBe('announcement');
    expect(result!.data.sessions![0].items![1].content).toBe(
      'Church picnic Saturday',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// parseImportFile
// ═══════════════════════════════════════════════════════════════════════

describe('parseImportFile', () => {
  function makeFileContent(file: OpenWorshipFile): string {
    return JSON.stringify(file);
  }

  it('parses a valid song file', () => {
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);

    const file: OpenWorshipFile = {
      version: '1.0',
      type: 'song',
      exportedAt: '2025-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      data: { songs: [makeSong()] },
    };

    const result = parseImportFile(makeFileContent(file));

    expect(result).not.toBeNull();
    expect(result!.file).toEqual(file);
    expect(result!.songs).toHaveLength(1);
    expect(result!.songs[0].song.title).toBe('Amazing Grace');
    expect(result!.songs[0].exists).toBe(false);
    expect(result!.sessions).toHaveLength(0);
  });

  it('detects existing song by ID', () => {
    mockDb.getAllSongs.mockReturnValue([
      makeDbSong({ id: 'song-1', title: 'Different Title' }),
    ]);
    mockDb.getAllSessions.mockReturnValue([]);

    const file: OpenWorshipFile = {
      version: '1.0',
      type: 'song',
      exportedAt: '2025-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      data: { songs: [makeSong({ id: 'song-1' })] },
    };

    const result = parseImportFile(makeFileContent(file));

    expect(result!.songs[0].exists).toBe(true);
    expect(result!.songs[0].existingId).toBe('song-1');
  });

  it('detects existing song by title (case insensitive)', () => {
    mockDb.getAllSongs.mockReturnValue([
      makeDbSong({ id: 'local-id', title: 'amazing grace' }),
    ]);
    mockDb.getAllSessions.mockReturnValue([]);

    const file: OpenWorshipFile = {
      version: '1.0',
      type: 'song',
      exportedAt: '2025-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      data: {
        songs: [makeSong({ id: 'different-id', title: 'Amazing Grace' })],
      },
    };

    const result = parseImportFile(makeFileContent(file));

    expect(result!.songs[0].exists).toBe(true);
    expect(result!.songs[0].existingId).toBe('local-id');
  });

  it('detects existing session by name (case insensitive)', () => {
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([
      makeDbSession({ id: 'local-session', name: 'sunday service' }),
    ]);

    const session: ExportedSession = {
      id: 'export-session',
      name: 'Sunday Service',
      songIds: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const file: OpenWorshipFile = {
      version: '1.1',
      type: 'session',
      exportedAt: '2025-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      data: { songs: [], sessions: [session] },
    };

    const result = parseImportFile(makeFileContent(file));

    expect(result!.sessions[0].exists).toBe(true);
    expect(result!.sessions[0].existingId).toBe('local-session');
  });

  it('detects missing songs in sessions', () => {
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: ['song-1', 'song-missing'],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const file: OpenWorshipFile = {
      version: '1.1',
      type: 'session',
      exportedAt: '2025-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      data: { songs: [makeSong({ id: 'song-1' })], sessions: [session] },
    };

    const result = parseImportFile(makeFileContent(file));

    expect(result!.sessions[0].missingSongs).toEqual(['song-missing']);
  });

  it('returns null for invalid JSON', () => {
    expect(parseImportFile('not json {')).toBeNull();
  });

  it('returns null for missing version', () => {
    const content = JSON.stringify({ type: 'song', data: {} });
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);
    expect(parseImportFile(content)).toBeNull();
  });

  it('returns null for missing type', () => {
    const content = JSON.stringify({ version: '1.0', data: {} });
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);
    expect(parseImportFile(content)).toBeNull();
  });

  it('returns null for missing data', () => {
    const content = JSON.stringify({ version: '1.0', type: 'song' });
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);
    expect(parseImportFile(content)).toBeNull();
  });

  it('handles file with no songs or sessions in data', () => {
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);

    const file: OpenWorshipFile = {
      version: '1.0',
      type: 'library',
      exportedAt: '2025-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      data: {},
    };

    const result = parseImportFile(JSON.stringify(file));

    expect(result).not.toBeNull();
    expect(result!.songs).toEqual([]);
    expect(result!.sessions).toEqual([]);
  });

  it('parses library file with multiple songs and sessions', () => {
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);

    const file: OpenWorshipFile = {
      version: '1.1',
      type: 'library',
      exportedAt: '2025-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      data: {
        songs: [
          makeSong({ id: 'song-1', title: 'Song A' }),
          makeSong({ id: 'song-2', title: 'Song B' }),
          makeSong({ id: 'song-3', title: 'Song C' }),
        ],
        sessions: [
          {
            id: 'session-1',
            name: 'Morning',
            songIds: ['song-1', 'song-2'],
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'session-2',
            name: 'Evening',
            songIds: ['song-3'],
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      },
    };

    const result = parseImportFile(JSON.stringify(file));

    expect(result!.songs).toHaveLength(3);
    expect(result!.sessions).toHaveLength(2);
    expect(result!.sessions[0].missingSongs).toEqual([]);
    expect(result!.sessions[1].missingSongs).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// importSelected — skip conflict resolution
// ═══════════════════════════════════════════════════════════════════════

describe('importSelected — skip', () => {
  function makePreview(overrides: Partial<ImportPreview> = {}): ImportPreview {
    return {
      file: {
        version: '1.0',
        type: 'song',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [makeSong()] },
      },
      songs: [{ song: makeSong(), exists: false }],
      sessions: [],
      ...overrides,
    };
  }

  it('imports a new song', () => {
    mockDb.addSong.mockReturnValue({ id: 'new-id' });

    const preview = makePreview();
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: [],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.success).toBe(true);
    expect(result.importedSongs).toBe(1);
    expect(result.skippedSongs).toBe(0);
    expect(mockDb.addSong).toHaveBeenCalledWith({
      title: 'Amazing Grace',
      lyrics: 'Amazing grace how sweet the sound',
      categories: ['Hymn'],
      tags: ['classic'],
    });
  });

  it('skips existing song with skip resolution', () => {
    const preview = makePreview({
      songs: [{ song: makeSong(), exists: true, existingId: 'existing-1' }],
    });
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: [],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.skippedSongs).toBe(1);
    expect(result.importedSongs).toBe(0);
    expect(mockDb.addSong).not.toHaveBeenCalled();
    expect(mockDb.updateSong).not.toHaveBeenCalled();
  });

  it('skips unselected songs', () => {
    const preview = makePreview();
    const options: ImportOptions = {
      selectedSongIds: [], // not selecting any songs
      selectedSessionIds: [],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.importedSongs).toBe(0);
    expect(result.skippedSongs).toBe(0);
    expect(mockDb.addSong).not.toHaveBeenCalled();
  });

  it('skips existing session with skip resolution', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };
    const preview = makePreview({
      sessions: [
        { session, exists: true, existingId: 'existing-s1', missingSongs: [] },
      ],
    });
    const options: ImportOptions = {
      selectedSongIds: [],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.skippedSessions).toBe(1);
    expect(result.importedSessions).toBe(0);
    expect(mockDb.createSession).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// importSelected — overwrite conflict resolution
// ═══════════════════════════════════════════════════════════════════════

describe('importSelected — overwrite', () => {
  it('overwrites existing song', () => {
    mockDb.updateSong.mockReturnValue(makeDbSong());

    const preview: ImportPreview = {
      file: {
        version: '1.0',
        type: 'song',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [makeSong()] },
      },
      songs: [{ song: makeSong(), exists: true, existingId: 'existing-1' }],
      sessions: [],
    };
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: [],
      conflictResolution: 'overwrite',
    };

    const result = importSelected(preview, options);

    expect(result.importedSongs).toBe(1);
    expect(result.skippedSongs).toBe(0);
    expect(mockDb.updateSong).toHaveBeenCalledWith('existing-1', {
      title: 'Amazing Grace',
      lyrics: 'Amazing grace how sweet the sound',
      categories: ['Hymn'],
      tags: ['classic'],
    });
    expect(mockDb.addSong).not.toHaveBeenCalled();
  });

  it('overwrites existing session (deletes and recreates)', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.deleteSession.mockReturnValue(true);
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [], sessions: [session] },
      },
      songs: [],
      sessions: [
        { session, exists: true, existingId: 'existing-s1', missingSongs: [] },
      ],
    };
    const options: ImportOptions = {
      selectedSongIds: [],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'overwrite',
    };

    const result = importSelected(preview, options);

    expect(result.importedSessions).toBe(1);
    expect(mockDb.deleteSession).toHaveBeenCalledWith('existing-s1');
    expect(mockDb.createSession).toHaveBeenCalledWith({ name: 'Service' });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// importSelected — duplicate conflict resolution
// ═══════════════════════════════════════════════════════════════════════

describe('importSelected — duplicate', () => {
  it('creates a duplicate song (new copy)', () => {
    mockDb.addSong.mockReturnValue({ id: 'new-dup-id' });

    const preview: ImportPreview = {
      file: {
        version: '1.0',
        type: 'song',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [makeSong()] },
      },
      songs: [{ song: makeSong(), exists: true, existingId: 'existing-1' }],
      sessions: [],
    };
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: [],
      conflictResolution: 'duplicate',
    };

    const result = importSelected(preview, options);

    expect(result.importedSongs).toBe(1);
    expect(mockDb.addSong).toHaveBeenCalled();
    expect(mockDb.updateSong).not.toHaveBeenCalled();
  });

  it('creates duplicate session with "(Imported)" suffix', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'dup-session' }));

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [], sessions: [session] },
      },
      songs: [],
      sessions: [
        { session, exists: true, existingId: 'existing-s1', missingSongs: [] },
      ],
    };
    const options: ImportOptions = {
      selectedSongIds: [],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'duplicate',
    };

    const result = importSelected(preview, options);

    expect(result.importedSessions).toBe(1);
    expect(mockDb.createSession).toHaveBeenCalledWith({
      name: 'Service (Imported)',
    });
    expect(mockDb.deleteSession).not.toHaveBeenCalled();
  });

  it('uses original name for duplicate session when session does not exist', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));

    const session: ExportedSession = {
      id: 'session-1',
      name: 'New Service',
      songIds: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [], sessions: [session] },
      },
      songs: [],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: [],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'duplicate',
    };

    const result = importSelected(preview, options);

    expect(mockDb.createSession).toHaveBeenCalledWith({ name: 'New Service' });
    expect(result.importedSessions).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// importSelected — session with items (v1.1 format)
// ═══════════════════════════════════════════════════════════════════════

describe('importSelected — v1.1 session items', () => {
  it('imports session with song items using songIdMap', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.addSong.mockReturnValue({ id: 'new-song-id' });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));
    mockDb.addSessionItem.mockReturnValue({});

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: ['song-1'],
      items: [{ type: 'song', position: 0, songId: 'song-1' }],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [makeSong()], sessions: [session] },
      },
      songs: [{ song: makeSong(), exists: false }],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.importedSongs).toBe(1);
    expect(result.importedSessions).toBe(1);
    expect(mockDb.addSessionItem).toHaveBeenCalledWith({
      sessionId: 'new-session',
      itemType: 'song',
      songId: 'new-song-id',
    });
  });

  it('imports bible items', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));
    mockDb.addSessionItem.mockReturnValue({});

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: [],
      items: [
        {
          type: 'bible',
          position: 0,
          translationId: 'kjv',
          translationName: 'KJV',
          bookId: 'JHN',
          bookName: 'John',
          chapter: 3,
          startVerse: 16,
          endVerse: 17,
          displayMode: 'verse',
        },
      ],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [], sessions: [session] },
      },
      songs: [],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: [],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.importedSessions).toBe(1);
    expect(mockDb.addSessionItem).toHaveBeenCalledWith({
      sessionId: 'new-session',
      itemType: 'bible',
      translationId: 'kjv',
      translationName: 'KJV',
      bookId: 'JHN',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 17,
      displayMode: 'verse',
    });
  });

  it('imports announcement items', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));
    mockDb.addSessionItem.mockReturnValue({});

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: [],
      items: [
        {
          type: 'announcement',
          position: 0,
          title: 'Welcome',
          content: 'Welcome to service',
          noteDisplayMode: 'overlay',
          noteContentType: 'text',
          imagePath: '/path/to/img.jpg',
          overlayPosition: 'bottom',
        },
      ],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [], sessions: [session] },
      },
      songs: [],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: [],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.importedSessions).toBe(1);
    expect(mockDb.addSessionItem).toHaveBeenCalledWith({
      sessionId: 'new-session',
      itemType: 'announcement',
      title: 'Welcome',
      content: 'Welcome to service',
      noteDisplayMode: 'overlay',
      noteContentType: 'text',
      imagePath: '/path/to/img.jpg',
      overlayPosition: 'bottom',
    });
  });

  it('skips song items whose songId was not mapped', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: ['unmapped-song'],
      items: [{ type: 'song', position: 0, songId: 'unmapped-song' }],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [], sessions: [session] },
      },
      songs: [],
      sessions: [{ session, exists: false, missingSongs: ['unmapped-song'] }],
    };
    const options: ImportOptions = {
      selectedSongIds: [],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.importedSessions).toBe(1);
    expect(mockDb.addSessionItem).not.toHaveBeenCalled();
  });

  it('imports mixed item types in a single session', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.addSong.mockReturnValue({ id: 'new-song-id' });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));
    mockDb.addSessionItem.mockReturnValue({});

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Full Service',
      songIds: ['song-1'],
      items: [
        { type: 'song', position: 0, songId: 'song-1' },
        {
          type: 'bible',
          position: 1,
          translationId: 'kjv',
          translationName: 'KJV',
          bookId: 'PSA',
          bookName: 'Psalms',
          chapter: 23,
          startVerse: 1,
          endVerse: 6,
          displayMode: 'passage',
        },
        {
          type: 'announcement',
          position: 2,
          title: 'Offering',
          content: 'Please give generously',
        },
      ],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [makeSong()], sessions: [session] },
      },
      songs: [{ song: makeSong(), exists: false }],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.importedSongs).toBe(1);
    expect(result.importedSessions).toBe(1);
    expect(mockDb.addSessionItem).toHaveBeenCalledTimes(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// importSelected — v1.0 backward compatibility
// ═══════════════════════════════════════════════════════════════════════

describe('importSelected — v1.0 backward compatibility', () => {
  it('falls back to songIds when items is empty', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.addSong.mockReturnValue({ id: 'new-song-id' });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));
    mockDb.addSessionItem.mockReturnValue({});

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Legacy Service',
      songIds: ['song-1'],
      // No items field (v1.0 format)
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.0',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '0.9.0',
        data: { songs: [makeSong()], sessions: [session] },
      },
      songs: [{ song: makeSong(), exists: false }],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.importedSessions).toBe(1);
    expect(mockDb.addSessionItem).toHaveBeenCalledWith({
      sessionId: 'new-session',
      itemType: 'song',
      songId: 'new-song-id',
    });
  });

  it('falls back to songIds when items array is empty', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.addSong.mockReturnValue({ id: 'new-song-id' });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));
    mockDb.addSessionItem.mockReturnValue({});

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Legacy Service',
      songIds: ['song-1'],
      items: [], // Empty items array = v1.0 fallback
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.0',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '0.9.0',
        data: { songs: [makeSong()], sessions: [session] },
      },
      songs: [{ song: makeSong(), exists: false }],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    importSelected(preview, options);

    expect(mockDb.addSessionItem).toHaveBeenCalledWith({
      sessionId: 'new-session',
      itemType: 'song',
      songId: 'new-song-id',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// importSelected — error handling
// ═══════════════════════════════════════════════════════════════════════

describe('importSelected — error handling', () => {
  it('reports song import errors without stopping', () => {
    mockDb.addSong.mockImplementation(() => {
      throw new Error('SQLITE_CONSTRAINT');
    });

    const preview: ImportPreview = {
      file: {
        version: '1.0',
        type: 'song',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [makeSong()] },
      },
      songs: [{ song: makeSong(), exists: false }],
      sessions: [],
    };
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: [],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Amazing Grace');
    expect(result.errors[0]).toContain('SQLITE_CONSTRAINT');
  });

  it('reports session import errors without stopping', () => {
    mockDb.createSession.mockImplementation(() => {
      throw new Error('Session creation failed');
    });

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Bad Session',
      songIds: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [], sessions: [session] },
      },
      songs: [],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: [],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Bad Session');
  });

  it('fails when database is null during session item import', () => {
    mockDb.getDb.mockReturnValue(null);
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: ['song-1'],
      items: [{ type: 'song', position: 0, songId: 'song-1' }],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [], sessions: [session] },
      },
      songs: [],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: [],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Database not initialized');
  });

  it('success is true when there are no errors', () => {
    mockDb.addSong.mockReturnValue({ id: 'new-id' });

    const preview: ImportPreview = {
      file: {
        version: '1.0',
        type: 'song',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [makeSong()] },
      },
      songs: [{ song: makeSong(), exists: false }],
      sessions: [],
    };
    const options: ImportOptions = {
      selectedSongIds: ['song-1'],
      selectedSessionIds: [],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// importSelected — song ID mapping
// ═══════════════════════════════════════════════════════════════════════

describe('importSelected — song ID mapping', () => {
  it('maps old song IDs to new IDs when adding new songs', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.addSong.mockReturnValue({ id: 'brand-new-id' });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));
    mockDb.addSessionItem.mockReturnValue({});

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: ['old-song-id'],
      items: [{ type: 'song', position: 0, songId: 'old-song-id' }],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: {
          songs: [makeSong({ id: 'old-song-id' })],
          sessions: [session],
        },
      },
      songs: [{ song: makeSong({ id: 'old-song-id' }), exists: false }],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: ['old-song-id'],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.importedSongs).toBe(1);
    expect(result.importedSessions).toBe(1);
    // Session item should reference the NEW song ID, not the old one
    expect(mockDb.addSessionItem).toHaveBeenCalledWith({
      sessionId: 'new-session',
      itemType: 'song',
      songId: 'brand-new-id',
    });
  });

  it('maps to existing ID on skip conflict resolution', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));
    mockDb.addSessionItem.mockReturnValue({});

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: ['export-song-id'],
      items: [{ type: 'song', position: 0, songId: 'export-song-id' }],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: {
          songs: [makeSong({ id: 'export-song-id' })],
          sessions: [session],
        },
      },
      songs: [
        {
          song: makeSong({ id: 'export-song-id' }),
          exists: true,
          existingId: 'local-song-id',
        },
      ],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: ['export-song-id'],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'skip',
    };

    const result = importSelected(preview, options);

    expect(result.skippedSongs).toBe(1);
    // Session should use the local existing ID
    expect(mockDb.addSessionItem).toHaveBeenCalledWith({
      sessionId: 'new-session',
      itemType: 'song',
      songId: 'local-song-id',
    });
  });

  it('maps to existing ID on overwrite conflict resolution', () => {
    const transactionFn = jest.fn((fn: () => void) => fn);
    mockDb.getDb.mockReturnValue({ transaction: transactionFn });
    mockDb.updateSong.mockReturnValue(makeDbSong());
    mockDb.createSession.mockReturnValue(makeDbSession({ id: 'new-session' }));
    mockDb.addSessionItem.mockReturnValue({});

    const session: ExportedSession = {
      id: 'session-1',
      name: 'Service',
      songIds: ['export-song-id'],
      items: [{ type: 'song', position: 0, songId: 'export-song-id' }],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const preview: ImportPreview = {
      file: {
        version: '1.1',
        type: 'session',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: {
          songs: [makeSong({ id: 'export-song-id' })],
          sessions: [session],
        },
      },
      songs: [
        {
          song: makeSong({ id: 'export-song-id' }),
          exists: true,
          existingId: 'local-song-id',
        },
      ],
      sessions: [{ session, exists: false, missingSongs: [] }],
    };
    const options: ImportOptions = {
      selectedSongIds: ['export-song-id'],
      selectedSessionIds: ['session-1'],
      conflictResolution: 'overwrite',
    };

    const result = importSelected(preview, options);

    expect(result.importedSongs).toBe(1);
    expect(mockDb.addSessionItem).toHaveBeenCalledWith({
      sessionId: 'new-session',
      itemType: 'song',
      songId: 'local-song-id',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Round-trip: export → parse → import
// ═══════════════════════════════════════════════════════════════════════

describe('round-trip export → parse → import', () => {
  it('exported song file can be parsed back', () => {
    const song = makeDbSong();
    mockDb.getSongById.mockReturnValue(song);
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);

    const exported = exportSong('song-1');
    expect(exported).not.toBeNull();

    const content = JSON.stringify(exported);
    const preview = parseImportFile(content);

    expect(preview).not.toBeNull();
    expect(preview!.songs).toHaveLength(1);
    expect(preview!.songs[0].song.title).toBe('Amazing Grace');
    expect(preview!.songs[0].exists).toBe(false);
  });

  it('exported session file can be parsed back', () => {
    mockDb.getSessionById.mockReturnValue(makeDbSession());
    mockDb.getSessionItems.mockReturnValue([
      makeDbSessionItem({ position: 0, songId: 'song-1' }),
    ]);
    mockDb.getSongById.mockReturnValue(makeDbSong());
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);

    const exported = exportSession('session-1');
    const preview = parseImportFile(JSON.stringify(exported));

    expect(preview).not.toBeNull();
    expect(preview!.songs).toHaveLength(1);
    expect(preview!.sessions).toHaveLength(1);
    expect(preview!.sessions[0].session.name).toBe('Sunday Service');
    expect(preview!.sessions[0].missingSongs).toEqual([]);
  });

  it('exported library file can be parsed back', () => {
    mockDb.getAllSongs.mockReturnValue([
      makeDbSong({ id: 'song-1', title: 'Song A' }),
      makeDbSong({ id: 'song-2', title: 'Song B' }),
    ]);
    mockDb.getAllSessions.mockReturnValue([makeDbSession()]);
    mockDb.getSessionItems.mockReturnValue([
      makeDbSessionItem({ songId: 'song-1' }),
    ]);

    const exported = exportLibrary();

    // Reset for parse
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);

    const preview = parseImportFile(JSON.stringify(exported));

    expect(preview).not.toBeNull();
    expect(preview!.songs).toHaveLength(2);
    expect(preview!.sessions).toHaveLength(1);
  });

  it('full round-trip: export song → parse → import into empty db', () => {
    // Export
    const song = makeDbSong();
    mockDb.getSongById.mockReturnValue(song);
    const exported = exportSong('song-1');

    // Parse
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);
    const preview = parseImportFile(JSON.stringify(exported));

    // Import
    mockDb.addSong.mockReturnValue({ id: 'imported-id' });
    const result = importSelected(preview!, {
      selectedSongIds: ['song-1'],
      selectedSessionIds: [],
      conflictResolution: 'skip',
    });

    expect(result.success).toBe(true);
    expect(result.importedSongs).toBe(1);
    expect(mockDb.addSong).toHaveBeenCalledWith({
      title: 'Amazing Grace',
      lyrics: 'Amazing grace how sweet the sound',
      categories: ['Hymn'],
      tags: ['classic'],
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Korean and space characters in data
// ═══════════════════════════════════════════════════════════════════════

describe('Korean and special character support', () => {
  it('exports song with Korean title and lyrics', () => {
    mockDb.getSongById.mockReturnValue(
      makeDbSong({
        id: 'korean-song',
        title: '놀라운 은혜',
        lyrics: '나 같은 죄인 살리신\n\n은혜 놀라워',
        categories: ['찬송가'],
        tags: ['한국어', '전통'],
      }),
    );

    const result = exportSong('korean-song');

    expect(result).not.toBeNull();
    expect(result!.data.songs![0].title).toBe('놀라운 은혜');
    expect(result!.data.songs![0].lyrics).toBe(
      '나 같은 죄인 살리신\n\n은혜 놀라워',
    );
    expect(result!.data.songs![0].categories).toEqual(['찬송가']);
    expect(result!.data.songs![0].tags).toEqual(['한국어', '전통']);
  });

  it('parses import file with Korean song and session names', () => {
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);

    const file: OpenWorshipFile = {
      version: '1.1',
      type: 'library',
      exportedAt: '2025-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      data: {
        songs: [
          makeSong({ id: 'kor-1', title: '주 하나님 지으신 모든 세계' }),
          makeSong({ id: 'kor-2', title: '내 주를 가까이 하게 함은' }),
        ],
        sessions: [
          {
            id: 'kor-session',
            name: '주일 오전 예배',
            songIds: ['kor-1', 'kor-2'],
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      },
    };

    const result = parseImportFile(JSON.stringify(file));

    expect(result).not.toBeNull();
    expect(result!.songs[0].song.title).toBe('주 하나님 지으신 모든 세계');
    expect(result!.songs[1].song.title).toBe('내 주를 가까이 하게 함은');
    expect(result!.sessions[0].session.name).toBe('주일 오전 예배');
  });

  it('detects conflict with Korean title (case-insensitive matching)', () => {
    mockDb.getAllSongs.mockReturnValue([
      makeDbSong({ id: 'local-kor', title: '놀라운 은혜' }),
    ]);
    mockDb.getAllSessions.mockReturnValue([]);

    const file: OpenWorshipFile = {
      version: '1.0',
      type: 'song',
      exportedAt: '2025-01-01T00:00:00.000Z',
      appVersion: '1.0.0',
      data: {
        songs: [makeSong({ id: 'import-kor', title: '놀라운 은혜' })],
      },
    };

    const result = parseImportFile(JSON.stringify(file));

    expect(result!.songs[0].exists).toBe(true);
    expect(result!.songs[0].existingId).toBe('local-kor');
  });

  it('imports song with Korean title and lyrics', () => {
    mockDb.addSong.mockReturnValue({ id: 'new-kor-id' });

    const koreanSong = makeSong({
      id: 'kor-import',
      title: '은혜 아니면',
      lyrics: '내가 매일 감사해\n\n은혜 아니면 안 돼',
      categories: ['CCM'],
      tags: ['감사', '은혜'],
    });

    const preview: ImportPreview = {
      file: {
        version: '1.0',
        type: 'song',
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        data: { songs: [koreanSong] },
      },
      songs: [{ song: koreanSong, exists: false }],
      sessions: [],
    };

    const result = importSelected(preview, {
      selectedSongIds: ['kor-import'],
      selectedSessionIds: [],
      conflictResolution: 'skip',
    });

    expect(result.success).toBe(true);
    expect(result.importedSongs).toBe(1);
    expect(mockDb.addSong).toHaveBeenCalledWith({
      title: '은혜 아니면',
      lyrics: '내가 매일 감사해\n\n은혜 아니면 안 돼',
      categories: ['CCM'],
      tags: ['감사', '은혜'],
    });
  });

  it('exports session with Korean announcement content', () => {
    mockDb.getSessionById.mockReturnValue(makeDbSession({ name: '수요 예배' }));
    mockDb.getSessionItems.mockReturnValue([
      makeDbSessionItem({
        itemType: 'announcement',
        songId: null,
        title: '교회 소식',
        content: '이번 주일 점심 식사가 있습니다',
      }),
    ]);

    const result = exportSession('session-1');

    expect(result).not.toBeNull();
    expect(result!.data.sessions![0].name).toBe('수요 예배');
    expect(result!.data.sessions![0].items![0].title).toBe('교회 소식');
    expect(result!.data.sessions![0].items![0].content).toBe(
      '이번 주일 점심 식사가 있습니다',
    );
  });

  it('handles title with mixed Korean, English, and spaces', () => {
    mockDb.getSongById.mockReturnValue(
      makeDbSong({
        title: 'Amazing Grace 놀라운 은혜 (Traditional)',
      }),
    );

    const result = exportSong('song-1');

    expect(result!.data.songs![0].title).toBe(
      'Amazing Grace 놀라운 은혜 (Traditional)',
    );
  });

  it('round-trip preserves Korean content through export → parse → import', () => {
    // Export
    mockDb.getSongById.mockReturnValue(
      makeDbSong({
        id: 'rt-kor',
        title: '거룩 거룩 거룩',
        lyrics: '거룩 거룩 거룩\n전능하신 주 하나님\n\n이른 아침 우리 찬송',
        categories: ['찬송가', '예배'],
        tags: ['삼위일체', '경배'],
      }),
    );

    const exported = exportSong('rt-kor');
    expect(exported).not.toBeNull();

    // Parse
    mockDb.getAllSongs.mockReturnValue([]);
    mockDb.getAllSessions.mockReturnValue([]);
    const preview = parseImportFile(JSON.stringify(exported));
    expect(preview).not.toBeNull();

    // Import
    mockDb.addSong.mockReturnValue({ id: 'imported-kor' });
    const result = importSelected(preview!, {
      selectedSongIds: ['rt-kor'],
      selectedSessionIds: [],
      conflictResolution: 'skip',
    });

    expect(result.success).toBe(true);
    expect(result.importedSongs).toBe(1);
    expect(mockDb.addSong).toHaveBeenCalledWith({
      title: '거룩 거룩 거룩',
      lyrics: '거룩 거룩 거룩\n전능하신 주 하나님\n\n이른 아침 우리 찬송',
      categories: ['찬송가', '예배'],
      tags: ['삼위일체', '경배'],
    });
  });
});
