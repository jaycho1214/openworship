/**
 * Export Service for OpenWorship
 * Handles exporting and importing songs and sessions
 */

import { app } from 'electron';
import log from 'electron-log';
import { databaseService } from './database';
import type {
  OpenWorshipFile,
  ExportedSong,
  ExportedSession,
  ImportPreview,
  ImportOptions,
  ImportResult,
} from '../../shared/types';

const APP_VERSION = app.getVersion();

/**
 * Export a single song
 */
export function exportSong(songId: string): OpenWorshipFile | null {
  try {
    const song = databaseService.getSongById(songId);
    if (!song) {
      log.error('[ExportService] Song not found:', songId);
      return null;
    }

    return {
      version: '1.0',
      type: 'song',
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      data: {
        songs: [songToExported(song)],
      },
    };
  } catch (error) {
    log.error('[ExportService] Error exporting song:', error);
    return null;
  }
}

/**
 * Export a session with its songs
 */
export function exportSession(sessionId: string): OpenWorshipFile | null {
  try {
    const session = databaseService.getSessionById(sessionId);
    if (!session) {
      log.error('[ExportService] Session not found:', sessionId);
      return null;
    }

    // Get songs via session_items
    const items = databaseService.getSessionItems(sessionId);
    const songIds = items
      .filter((item) => item.itemType === 'song' && item.songId)
      .map((item) => item.songId!);

    const songs: ExportedSong[] = songIds
      .map((id) => databaseService.getSongById(id))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map(songToExported);

    return {
      version: '1.0',
      type: 'session',
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      data: {
        songs,
        sessions: [
          {
            id: session.id,
            name: session.name,
            songIds: songs.map((s) => s.id),
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          },
        ],
      },
    };
  } catch (error) {
    log.error('[ExportService] Error exporting session:', error);
    return null;
  }
}

/**
 * Export entire library (all songs and sessions)
 */
export function exportLibrary(): OpenWorshipFile | null {
  try {
    const allSongs = databaseService.getAllSongs();
    const allSessions = databaseService.getAllSessions();

    const songs: ExportedSong[] = allSongs.map(songToExported);

    // Build sessions with song IDs using session_items in a single pass
    // instead of calling getSessionById (N+1 query) for each session
    const sessions: ExportedSession[] = allSessions.map((session) => {
      const items = databaseService.getSessionItems(session.id);
      const songIds = items
        .filter((item) => item.itemType === 'song' && item.songId)
        .map((item) => item.songId!);
      return {
        id: session.id,
        name: session.name,
        songIds,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    });

    return {
      version: '1.0',
      type: 'library',
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      data: {
        songs,
        sessions,
      },
    };
  } catch (error) {
    log.error('[ExportService] Error exporting library:', error);
    return null;
  }
}

/**
 * Parse and preview import file contents
 */
export function parseImportFile(content: string): ImportPreview | null {
  try {
    const file = JSON.parse(content) as OpenWorshipFile;

    // Validate file format
    if (!file.version || !file.type || !file.data) {
      log.error('[ExportService] Invalid file format');
      return null;
    }

    const existingSongs = databaseService.getAllSongs();
    const existingSessions = databaseService.getAllSessions();

    const songsPreview = (file.data.songs || []).map((song) => {
      const existing = existingSongs.find(
        (s) =>
          s.id === song.id ||
          s.title.toLowerCase() === song.title.toLowerCase(),
      );
      return {
        song,
        exists: !!existing,
        existingId: existing?.id,
      };
    });

    const sessionsPreview = (file.data.sessions || []).map((session) => {
      const existing = existingSessions.find(
        (s) =>
          s.id === session.id ||
          s.name.toLowerCase() === session.name.toLowerCase(),
      );
      const songIds = new Set((file.data.songs || []).map((s) => s.id));
      const missingSongs = session.songIds.filter((id) => !songIds.has(id));
      return {
        session,
        exists: !!existing,
        existingId: existing?.id,
        missingSongs,
      };
    });

    return {
      file,
      songs: songsPreview,
      sessions: sessionsPreview,
    };
  } catch (error) {
    log.error('[ExportService] Error parsing import file:', error);
    return null;
  }
}

/**
 * Import selected items from preview
 */
export function importSelected(
  preview: ImportPreview,
  options: ImportOptions,
): ImportResult {
  const result: ImportResult = {
    success: true,
    importedSongs: 0,
    importedSessions: 0,
    skippedSongs: 0,
    skippedSessions: 0,
    errors: [],
  };

  // Map old IDs to new IDs (for sessions referencing songs)
  const songIdMap = new Map<string, string>();

  // Import selected songs
  for (const songPreview of preview.songs) {
    if (!options.selectedSongIds.includes(songPreview.song.id)) {
      continue;
    }

    try {
      if (songPreview.exists && songPreview.existingId) {
        if (options.conflictResolution === 'skip') {
          result.skippedSongs++;
          songIdMap.set(songPreview.song.id, songPreview.existingId);
          continue;
        } else if (options.conflictResolution === 'overwrite') {
          // Update existing song
          databaseService.updateSong(songPreview.existingId, {
            title: songPreview.song.title,
            lyrics: songPreview.song.lyrics,
            categories: songPreview.song.categories,
            tags: songPreview.song.tags,
          });
          songIdMap.set(songPreview.song.id, songPreview.existingId);
          result.importedSongs++;
          continue;
        }
        // 'duplicate' falls through to add new song
      }

      // Add new song
      const newSong = databaseService.addSong({
        title: songPreview.song.title,
        lyrics: songPreview.song.lyrics,
        categories: songPreview.song.categories,
        tags: songPreview.song.tags,
      });
      songIdMap.set(songPreview.song.id, newSong.id);
      result.importedSongs++;
    } catch (error) {
      result.errors.push(
        `Failed to import song "${songPreview.song.title}": ${error}`,
      );
    }
  }

  // Import selected sessions
  for (const sessionPreview of preview.sessions) {
    if (!options.selectedSessionIds.includes(sessionPreview.session.id)) {
      continue;
    }

    try {
      if (sessionPreview.exists && sessionPreview.existingId) {
        if (options.conflictResolution === 'skip') {
          result.skippedSessions++;
          continue;
        } else if (options.conflictResolution === 'overwrite') {
          // Delete and recreate
          databaseService.deleteSession(sessionPreview.existingId);
        }
        // 'duplicate' creates new session with different name
      }

      // Create session
      const sessionName =
        options.conflictResolution === 'duplicate' && sessionPreview.exists
          ? `${sessionPreview.session.name} (Imported)`
          : sessionPreview.session.name;

      const newSession = databaseService.createSession({ name: sessionName });

      // Add songs to session via session_items (using mapped IDs)
      for (const oldSongId of sessionPreview.session.songIds) {
        const newSongId = songIdMap.get(oldSongId);
        if (newSongId) {
          databaseService.addSessionItem({
            sessionId: newSession.id,
            itemType: 'song',
            songId: newSongId,
          });
        }
      }

      result.importedSessions++;
    } catch (error) {
      result.errors.push(
        `Failed to import session "${sessionPreview.session.name}": ${error}`,
      );
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Helper to convert database song to exported format
function songToExported(song: any): ExportedSong {
  return {
    id: song.id,
    title: song.title,
    lyrics: song.lyrics,
    categories: song.categories || [],
    tags: song.tags || [],
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  };
}

export const exportService = {
  exportSong,
  exportSession,
  exportLibrary,
  parseImportFile,
  importSelected,
};
