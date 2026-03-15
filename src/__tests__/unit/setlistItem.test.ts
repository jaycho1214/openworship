import {
  isSongItem,
  isBibleItem,
  isAnnouncementItem,
  getItemLabel,
  getItemSlides,
  getItemSlideCount,
  SongSetlistItem,
  BibleSetlistItem,
  AnnouncementSetlistItem,
} from '../../shared/types/setlistItem';
import type { Slide, Song } from '../../shared/types/song';

// ── Test data factories ──────────────────────────────────────────────────

function makeSongItem(
  overrides: Partial<SongSetlistItem> = {},
): SongSetlistItem {
  return {
    id: 'song-1',
    type: 'song',
    songId: 'lib-1',
    position: 0,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeBibleItem(
  overrides: Partial<BibleSetlistItem> = {},
): BibleSetlistItem {
  return {
    id: 'bible-1',
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
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAnnouncementItem(
  overrides: Partial<AnnouncementSetlistItem> = {},
): AnnouncementSetlistItem {
  return {
    id: 'note-1',
    type: 'announcement',
    title: 'Welcome',
    content: 'Welcome to our service',
    position: 0,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const testSlide: Slide = {
  id: 'slide-1',
  lines: ['Amazing grace', 'How sweet the sound'],
};

const testSong: Song = {
  id: 'lib-1',
  title: 'Amazing Grace',
  rawLyrics: 'Amazing grace\nHow sweet the sound',
  slides: [testSlide],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ── Type guards ──────────────────────────────────────────────────────────

describe('isSongItem', () => {
  it('returns true for song items', () => {
    expect(isSongItem(makeSongItem())).toBe(true);
  });

  it('returns false for bible items', () => {
    expect(isSongItem(makeBibleItem())).toBe(false);
  });

  it('returns false for announcement items', () => {
    expect(isSongItem(makeAnnouncementItem())).toBe(false);
  });
});

describe('isBibleItem', () => {
  it('returns true for bible items', () => {
    expect(isBibleItem(makeBibleItem())).toBe(true);
  });

  it('returns false for song items', () => {
    expect(isBibleItem(makeSongItem())).toBe(false);
  });

  it('returns false for announcement items', () => {
    expect(isBibleItem(makeAnnouncementItem())).toBe(false);
  });
});

describe('isAnnouncementItem', () => {
  it('returns true for announcement items', () => {
    expect(isAnnouncementItem(makeAnnouncementItem())).toBe(true);
  });

  it('returns false for song items', () => {
    expect(isAnnouncementItem(makeSongItem())).toBe(false);
  });

  it('returns false for bible items', () => {
    expect(isAnnouncementItem(makeBibleItem())).toBe(false);
  });
});

// ── getItemLabel ─────────────────────────────────────────────────────────

describe('getItemLabel', () => {
  it('returns song title for song items', () => {
    const item = makeSongItem({ _song: testSong });
    expect(getItemLabel(item)).toBe('Amazing Grace');
  });

  it('returns "Unknown Song" when _song is missing', () => {
    const item = makeSongItem();
    expect(getItemLabel(item)).toBe('Unknown Song');
  });

  it('returns formatted reference for bible items (single verse)', () => {
    const item = makeBibleItem();
    expect(getItemLabel(item)).toBe('John 3:16');
  });

  it('returns formatted reference for bible items (verse range)', () => {
    const item = makeBibleItem({ startVerse: 1, endVerse: 10 });
    expect(getItemLabel(item)).toBe('John 3:1-10');
  });

  it('returns title for announcement items', () => {
    const item = makeAnnouncementItem({ title: 'Potluck Reminder' });
    expect(getItemLabel(item)).toBe('Potluck Reminder');
  });
});

// ── getItemSlides ────────────────────────────────────────────────────────

describe('getItemSlides', () => {
  it('returns _slides for song items when available', () => {
    const slides = [testSlide];
    const item = makeSongItem({ _slides: slides });
    expect(getItemSlides(item)).toBe(slides);
  });

  it('falls back to _song.slides for song items', () => {
    const item = makeSongItem({ _song: testSong });
    expect(getItemSlides(item)).toBe(testSong.slides);
  });

  it('returns empty array for song items with no data', () => {
    const item = makeSongItem();
    expect(getItemSlides(item)).toEqual([]);
  });

  it('returns _slides for bible items', () => {
    const slides = [testSlide];
    const item = makeBibleItem({ _slides: slides });
    expect(getItemSlides(item)).toBe(slides);
  });

  it('returns empty array for bible items with no slides', () => {
    expect(getItemSlides(makeBibleItem())).toEqual([]);
  });

  it('returns _slides for announcement items', () => {
    const slides = [testSlide];
    const item = makeAnnouncementItem({ _slides: slides });
    expect(getItemSlides(item)).toBe(slides);
  });

  it('returns empty array for announcement items with no slides', () => {
    expect(getItemSlides(makeAnnouncementItem())).toEqual([]);
  });
});

// ── getItemSlideCount ────────────────────────────────────────────────────

describe('getItemSlideCount', () => {
  it('returns 0 for items with no slides', () => {
    expect(getItemSlideCount(makeSongItem())).toBe(0);
  });

  it('returns correct count for items with slides', () => {
    const item = makeSongItem({
      _slides: [testSlide, { id: 's2', lines: ['Line'] }],
    });
    expect(getItemSlideCount(item)).toBe(2);
  });
});
