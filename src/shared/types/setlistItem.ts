/**
 * Unified setlist item types for OpenWorship
 * Supports songs, Bible verses, and announcements in a single setlist
 */
/* eslint-disable no-underscore-dangle */

import { Slide, Song } from './song';
import { BibleDisplayMode } from './bible';

// Re-export for convenience
export { BibleDisplayMode };

/**
 * Base setlist item properties shared by all types
 */
interface BaseSetlistItem {
  /** Unique identifier for this setlist item */
  id: string;
  /** Position in the setlist (0-indexed) */
  position: number;
  /** When this item was added to the setlist (ISO string) */
  createdAt: string;
  /** When this item was last updated (ISO string) */
  updatedAt?: string;
}

/**
 * Song item in setlist
 */
export interface SongSetlistItem extends BaseSetlistItem {
  type: 'song';
  /** Reference to library song ID */
  songId: string;
  /** Cached song data (populated when loading) */
  _song?: Song;
  /** Cached slides (populated when loading) */
  _slides?: Slide[];
}

/**
 * Bible verse item in setlist
 */
export interface BibleSetlistItem extends BaseSetlistItem {
  type: 'bible';
  /** Translation ID */
  translationId: string;
  /** Translation name (for display) */
  translationName: string;
  /** Book ID */
  bookId: string;
  /** Book name (for display) */
  bookName: string;
  /** Chapter number */
  chapter: number;
  /** Starting verse number */
  startVerse: number;
  /** Ending verse number */
  endVerse: number;
  /** How to display verses */
  displayMode: BibleDisplayMode;
  /** Cached slides (populated when loading) */
  _slides?: Slide[];
}

/**
 * Announcement/note item in setlist
 */
export interface AnnouncementSetlistItem extends BaseSetlistItem {
  type: 'announcement';
  /** Announcement title */
  title: string;
  /** Announcement content (supports multi-line) */
  content: string;
  /** Cached slides (populated when loading) */
  _slides?: Slide[];
}

/**
 * Union type for all setlist item types
 */
export type SetlistItem =
  | SongSetlistItem
  | BibleSetlistItem
  | AnnouncementSetlistItem;

/**
 * Type guard for song items
 */
export function isSongItem(item: SetlistItem): item is SongSetlistItem {
  return item.type === 'song';
}

/**
 * Type guard for Bible items
 */
export function isBibleItem(item: SetlistItem): item is BibleSetlistItem {
  return item.type === 'bible';
}

/**
 * Type guard for announcement items
 */
export function isAnnouncementItem(
  item: SetlistItem,
): item is AnnouncementSetlistItem {
  return item.type === 'announcement';
}

/**
 * Input for creating a new song setlist item
 */
export interface SongSetlistItemInput {
  type: 'song';
  songId: string;
}

/**
 * Input for creating a new Bible setlist item
 */
export interface BibleSetlistItemInput {
  type: 'bible';
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
 * Input for creating a new announcement setlist item
 */
export interface AnnouncementSetlistItemInput {
  type: 'announcement';
  title: string;
  content: string;
}

/**
 * Union type for all setlist item inputs
 */
export type SetlistItemInput =
  | SongSetlistItemInput
  | BibleSetlistItemInput
  | AnnouncementSetlistItemInput;

/**
 * Unified setlist with mixed content types
 */
export interface UnifiedSetlist {
  id: string;
  name: string;
  items: SetlistItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Get display label for a setlist item
 */
export function getItemLabel(item: SetlistItem): string {
  switch (item.type) {
    case 'song':
      return item._song?.title || 'Unknown Song';
    case 'bible':
      return `${item.bookName} ${item.chapter}:${item.startVerse}${item.endVerse !== item.startVerse ? `-${item.endVerse}` : ''}`;
    case 'announcement':
      return item.title;
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

/**
 * Get slides for a setlist item
 */
export function getItemSlides(item: SetlistItem): Slide[] {
  switch (item.type) {
    case 'song':
      return item._slides || item._song?.slides || [];
    case 'bible':
      return item._slides || [];
    case 'announcement':
      return item._slides || [];
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

/**
 * Get total slide count for a setlist item
 */
export function getItemSlideCount(item: SetlistItem): number {
  return getItemSlides(item).length;
}

/**
 * Content type identifier
 */
export type SetlistItemType = 'song' | 'bible' | 'announcement';
