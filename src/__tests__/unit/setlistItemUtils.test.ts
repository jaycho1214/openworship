import {
  getItemSlides,
  getItemTitle,
} from '../../renderer/shared/utils/setlistItemUtils';
import type {
  SongSetlistItem,
  BibleSetlistItem,
  AnnouncementSetlistItem,
} from '../../shared/types/setlistItem';
import type { Slide, Song } from '../../shared/types/song';

const testSlide: Slide = {
  id: 'slide-1',
  lines: ['Amazing grace'],
};

const testSong: Song = {
  id: 'lib-1',
  title: 'Amazing Grace',
  rawLyrics: 'Amazing grace',
  slides: [testSlide],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ── getItemSlides (renderer version) ─────────────────────────────────────

describe('getItemSlides (renderer)', () => {
  it('returns empty array for null', () => {
    expect(getItemSlides(null)).toEqual([]);
  });

  it('returns song slides from _song', () => {
    const item: SongSetlistItem = {
      id: '1',
      type: 'song',
      songId: 'lib-1',
      position: 0,
      createdAt: '2024-01-01',
      _song: testSong,
    };
    expect(getItemSlides(item)).toEqual(testSong.slides);
  });

  it('returns empty array for song without _song', () => {
    const item: SongSetlistItem = {
      id: '1',
      type: 'song',
      songId: 'lib-1',
      position: 0,
      createdAt: '2024-01-01',
    };
    expect(getItemSlides(item)).toEqual([]);
  });

  it('returns _slides for bible items', () => {
    const slides = [testSlide];
    const item: BibleSetlistItem = {
      id: '1',
      type: 'bible',
      translationId: 'kjv',
      translationName: 'KJV',
      bookId: 'john',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      displayMode: 'one-per-slide',
      position: 0,
      createdAt: '2024-01-01',
      _slides: slides,
    };
    expect(getItemSlides(item)).toBe(slides);
  });

  it('returns _slides for announcement items', () => {
    const slides = [testSlide];
    const item: AnnouncementSetlistItem = {
      id: '1',
      type: 'announcement',
      title: 'Test',
      content: 'Content',
      position: 0,
      createdAt: '2024-01-01',
      _slides: slides,
    };
    expect(getItemSlides(item)).toBe(slides);
  });
});

// ── getItemTitle ─────────────────────────────────────────────────────────

describe('getItemTitle', () => {
  it('returns empty string for null', () => {
    expect(getItemTitle(null)).toBe('');
  });

  it('returns song title', () => {
    const item: SongSetlistItem = {
      id: '1',
      type: 'song',
      songId: 'lib-1',
      position: 0,
      createdAt: '2024-01-01',
      _song: testSong,
    };
    expect(getItemTitle(item)).toBe('Amazing Grace');
  });

  it('returns "Unknown Song" for song without _song', () => {
    const item: SongSetlistItem = {
      id: '1',
      type: 'song',
      songId: 'lib-1',
      position: 0,
      createdAt: '2024-01-01',
    };
    expect(getItemTitle(item)).toBe('Unknown Song');
  });

  it('uses translation function when provided for unknown song', () => {
    const item: SongSetlistItem = {
      id: '1',
      type: 'song',
      songId: 'lib-1',
      position: 0,
      createdAt: '2024-01-01',
    };
    const t = (key: string) => (key === 'unknownSong' ? '알 수 없는 곡' : key);
    expect(getItemTitle(item, t)).toBe('알 수 없는 곡');
  });

  it('returns formatted bible reference (single verse)', () => {
    const item: BibleSetlistItem = {
      id: '1',
      type: 'bible',
      translationId: 'kjv',
      translationName: 'KJV',
      bookId: 'john',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      displayMode: 'one-per-slide',
      position: 0,
      createdAt: '2024-01-01',
    };
    expect(getItemTitle(item)).toBe('John 3:16');
  });

  it('returns formatted bible reference (verse range)', () => {
    const item: BibleSetlistItem = {
      id: '1',
      type: 'bible',
      translationId: 'kjv',
      translationName: 'KJV',
      bookId: 'ps',
      bookName: 'Psalms',
      chapter: 23,
      startVerse: 1,
      endVerse: 6,
      displayMode: 'one-per-slide',
      position: 0,
      createdAt: '2024-01-01',
    };
    expect(getItemTitle(item)).toBe('Psalms 23:1-6');
  });

  it('returns announcement title', () => {
    const item: AnnouncementSetlistItem = {
      id: '1',
      type: 'announcement',
      title: 'Potluck',
      content: 'Bring food',
      position: 0,
      createdAt: '2024-01-01',
    };
    expect(getItemTitle(item)).toBe('Potluck');
  });
});
