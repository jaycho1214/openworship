/**
 * Session Item IPC handlers
 * Handles unified setlist item operations
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { v4 as uuidv4 } from 'uuid';
import { databaseService, DbSessionItem } from '../services/database';
import { bibleService } from '../services/BibleService';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../../shared/types';
import {
  SetlistItem,
  SetlistItemInput,
  SongSetlistItem,
  BibleSetlistItem,
  AnnouncementSetlistItem,
} from '../../shared/types/setlistItem';
import { Slide } from '../../shared/types/song';
import {
  parseLyricsToSlides,
  resolveSectionReferences,
} from '../../shared/utils/lyricsParser';

/**
 * Convert DB session item to SetlistItem
 */
const dbToSetlistItem = (db: DbSessionItem): SetlistItem => {
  const base = {
    id: db.id,
    position: db.position,
    createdAt: db.createdAt,
  };

  switch (db.itemType) {
    case 'song':
      return {
        ...base,
        type: 'song',
        songId: db.songId!,
      } as SongSetlistItem;

    case 'bible':
      return {
        ...base,
        type: 'bible',
        translationId: db.translationId!,
        translationName: db.translationName!,
        bookId: db.bookId!,
        bookName: db.bookName!,
        chapter: db.chapter!,
        startVerse: db.startVerse!,
        endVerse: db.endVerse!,
        displayMode:
          (db.displayMode as 'one-per-slide' | 'range-on-slide') ||
          'one-per-slide',
      } as BibleSetlistItem;

    case 'announcement':
      return {
        ...base,
        type: 'announcement',
        title: db.title!,
        content: db.content!,
      } as AnnouncementSetlistItem;

    default:
      throw new Error(`Unknown item type: ${db.itemType}`);
  }
};

/**
 * Generate slides for an announcement
 */
const announcementToSlides = (title: string, content: string): Slide[] => {
  // Split content by double newlines for multiple slides
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());

  if (paragraphs.length === 0) {
    return [
      {
        id: uuidv4(),
        lines: [title],
        section: 'Announcement',
      },
    ];
  }

  return paragraphs.map((paragraph, index) => ({
    id: uuidv4(),
    lines: index === 0 ? [title, paragraph] : [paragraph],
    section: index === 0 ? 'Announcement' : undefined,
  }));
};

/**
 * Populate slides on a SetlistItem based on its type.
 * Mutates the item in place and returns it.
 */
/* eslint-disable no-underscore-dangle */
const populateItemSlides = (item: SetlistItem): SetlistItem => {
  if (item.type === 'song' && item.songId) {
    const song = databaseService.getSongById(item.songId);
    if (song) {
      const songItem = item as SongSetlistItem;
      songItem._song = {
        id: song.id,
        title: song.title,
        rawLyrics: song.lyrics,
        slides: resolveSectionReferences(parseLyricsToSlides(song.lyrics)),
        createdAt: song.createdAt,
        updatedAt: song.updatedAt,
      };
      songItem._slides = songItem._song?.slides;
    }
  } else if (item.type === 'bible') {
    const bibleItem = item as BibleSetlistItem;
    const verses = bibleService.getVersesRange(
      bibleItem.bookId,
      bibleItem.chapter,
      bibleItem.startVerse,
      bibleItem.endVerse,
    );
    bibleItem._slides = bibleService.versesToSlides(
      verses,
      bibleItem.bookName,
      bibleItem.chapter,
      bibleItem.displayMode,
    );
  } else if (item.type === 'announcement') {
    const announcementItem = item as AnnouncementSetlistItem;
    announcementItem._slides = announcementToSlides(
      announcementItem.title,
      announcementItem.content,
    );
  }
  return item;
};
/* eslint-enable no-underscore-dangle */

/**
 * Register all Session Item IPC handlers
 */
export const registerSessionItemHandlers = (): void => {
  // Get all items for a session (with slides populated)
  ipcMain.handle('sessionItem:getAll', async (_, sessionId: string) => {
    try {
      const dbItems = databaseService.getSessionItems(sessionId);
      const items = dbItems.map((dbItem) =>
        populateItemSlides(dbToSetlistItem(dbItem)),
      );
      return successResponse(items);
    } catch (error) {
      log.error('[SessionItem] Error getting items:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Add item to session
  ipcMain.handle(
    'sessionItem:add',
    async (_, sessionId: string, input: SetlistItemInput) => {
      try {
        const dbItem = databaseService.addSessionItem({
          sessionId,
          itemType: input.type,
          songId: input.type === 'song' ? input.songId : undefined,
          translationId:
            input.type === 'bible' ? input.translationId : undefined,
          translationName:
            input.type === 'bible' ? input.translationName : undefined,
          bookId: input.type === 'bible' ? input.bookId : undefined,
          bookName: input.type === 'bible' ? input.bookName : undefined,
          chapter: input.type === 'bible' ? input.chapter : undefined,
          startVerse: input.type === 'bible' ? input.startVerse : undefined,
          endVerse: input.type === 'bible' ? input.endVerse : undefined,
          displayMode: input.type === 'bible' ? input.displayMode : undefined,
          title: input.type === 'announcement' ? input.title : undefined,
          content: input.type === 'announcement' ? input.content : undefined,
        });

        const item = populateItemSlides(dbToSetlistItem(dbItem));
        return successResponse(item);
      } catch (error) {
        log.error('[SessionItem] Error adding item:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  // Update item
  ipcMain.handle(
    'sessionItem:update',
    async (
      _,
      id: string,
      updates: Partial<{
        title: string;
        content: string;
        startVerse: number;
        endVerse: number;
        displayMode: string;
      }>,
    ) => {
      try {
        const dbItem = databaseService.updateSessionItem(id, updates);
        if (!dbItem) {
          return errorResponse('Item not found');
        }

        const item = populateItemSlides(dbToSetlistItem(dbItem));
        return successResponse(item);
      } catch (error) {
        log.error('[SessionItem] Error updating item:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  // Delete item
  ipcMain.handle('sessionItem:delete', async (_, id: string) => {
    try {
      const success = databaseService.deleteSessionItem(id);
      return successResponse(success);
    } catch (error) {
      log.error('[SessionItem] Error deleting item:', error);
      return errorResponse(getErrorMessage(error));
    }
  });

  // Reorder items
  ipcMain.handle(
    'sessionItem:reorder',
    async (_, sessionId: string, itemIds: string[]) => {
      try {
        const success = databaseService.reorderSessionItems(sessionId, itemIds);
        return successResponse(success);
      } catch (error) {
        log.error('[SessionItem] Error reordering items:', error);
        return errorResponse(getErrorMessage(error));
      }
    },
  );

  log.info('[SessionItem] Handlers registered');
};
