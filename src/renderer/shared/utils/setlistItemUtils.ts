import type { Slide } from '../../../shared/types/song';
import {
  SetlistItem,
  isSongItem,
  isBibleItem,
  isAnnouncementItem,
} from '../../../shared/types/setlistItem';

/**
 * Get slides from any setlist item type.
 */
/* eslint-disable no-underscore-dangle */
export function getItemSlides(item: SetlistItem | null): Slide[] {
  if (!item) return [];
  if (isSongItem(item)) {
    return item._song?.slides || [];
  }
  if (isBibleItem(item)) {
    return item._slides || [];
  }
  if (isAnnouncementItem(item)) {
    return item._slides || [];
  }
  return [];
}
/* eslint-enable no-underscore-dangle */

/**
 * Get a display title from any setlist item type.
 */
/* eslint-disable no-underscore-dangle */
export function getItemTitle(
  item: SetlistItem | null,
  t?: (key: string) => string,
): string {
  if (!item) return '';
  if (isSongItem(item)) {
    return item._song?.title || (t ? t('unknownSong') : 'Unknown Song');
  }
  if (isBibleItem(item)) {
    const verseRange =
      item.startVerse === item.endVerse
        ? `${item.startVerse}`
        : `${item.startVerse}-${item.endVerse}`;
    return `${item.bookName} ${item.chapter}:${verseRange}`;
  }
  if (isAnnouncementItem(item)) {
    return item.title;
  }
  return t ? t('unknownItem') : 'Unknown';
}
/* eslint-enable no-underscore-dangle */
