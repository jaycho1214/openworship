import {
  parseBibleReference,
  BIBLE_BOOK_PATTERNS,
} from '../../renderer/shared/utils/bibleUtils';

describe('parseBibleReference', () => {
  describe('valid English references', () => {
    it('parses "John 3:16" (single verse)', () => {
      const result = parseBibleReference('John 3:16');
      expect(result).toEqual({
        bookName: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
      });
    });

    it('parses "Genesis 1:1-10" (verse range)', () => {
      const result = parseBibleReference('Genesis 1:1-10');
      expect(result).toEqual({
        bookName: 'Genesis',
        chapter: 1,
        startVerse: 1,
        endVerse: 10,
      });
    });

    it('parses "1 John 3:16-18" (numbered book with range)', () => {
      const result = parseBibleReference('1 John 3:16-18');
      expect(result).toEqual({
        bookName: '1 John',
        chapter: 3,
        startVerse: 16,
        endVerse: 18,
      });
    });

    it('parses "Psalm 23:1" (single verse psalm)', () => {
      const result = parseBibleReference('Psalm 23:1');
      expect(result).toEqual({
        bookName: 'Psalm',
        chapter: 23,
        startVerse: 1,
        endVerse: 1,
      });
    });

    it('parses "2 Corinthians 5:17"', () => {
      const result = parseBibleReference('2 Corinthians 5:17');
      expect(result).toEqual({
        bookName: '2 Corinthians',
        chapter: 5,
        startVerse: 17,
        endVerse: 17,
      });
    });

    it('parses "Song of Solomon 2:1"', () => {
      const result = parseBibleReference('Song of Solomon 2:1');
      expect(result).toEqual({
        bookName: 'Song of Solomon',
        chapter: 2,
        startVerse: 1,
        endVerse: 1,
      });
    });
  });

  describe('valid Korean references', () => {
    it('parses "창세기 1:1"', () => {
      const result = parseBibleReference('창세기 1:1');
      expect(result).toEqual({
        bookName: '창세기',
        chapter: 1,
        startVerse: 1,
        endVerse: 1,
      });
    });

    it('parses "요한복음 3:16"', () => {
      const result = parseBibleReference('요한복음 3:16');
      expect(result).toEqual({
        bookName: '요한복음',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
      });
    });

    it('parses "시편 23:1-6" (Korean range)', () => {
      const result = parseBibleReference('시편 23:1-6');
      expect(result).toEqual({
        bookName: '시편',
        chapter: 23,
        startVerse: 1,
        endVerse: 6,
      });
    });
  });

  describe('special characters', () => {
    it('handles full-width colon (：)', () => {
      const result = parseBibleReference('John 3：16');
      expect(result).toEqual({
        bookName: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
      });
    });

    it('handles en-dash (–) in range', () => {
      const result = parseBibleReference('Genesis 1:1–10');
      expect(result).toEqual({
        bookName: 'Genesis',
        chapter: 1,
        startVerse: 1,
        endVerse: 10,
      });
    });
  });

  describe('whitespace handling', () => {
    it('trims leading/trailing whitespace', () => {
      const result = parseBibleReference('  John 3:16  ');
      expect(result).not.toBeNull();
      expect(result!.bookName).toBe('John');
    });

    it('handles extra spaces between parts', () => {
      const result = parseBibleReference('John  3 : 16');
      expect(result).not.toBeNull();
    });
  });

  describe('partial book name matching', () => {
    it('matches partial book names (prefix)', () => {
      const result = parseBibleReference('Gen 1:1');
      expect(result).not.toBeNull();
      expect(result!.bookName).toBe('Gen');
    });

    it('matches "Matt 5:1"', () => {
      const result = parseBibleReference('Matt 5:1');
      expect(result).not.toBeNull();
    });
  });

  describe('invalid references', () => {
    it('returns null for empty string', () => {
      expect(parseBibleReference('')).toBeNull();
    });

    it('returns null for plain text', () => {
      expect(parseBibleReference('hello world')).toBeNull();
    });

    it('returns null for missing verse', () => {
      expect(parseBibleReference('John 3')).toBeNull();
    });

    it('returns null for unknown book name', () => {
      expect(parseBibleReference('FakeBook 1:1')).toBeNull();
    });

    it('returns null for just numbers', () => {
      expect(parseBibleReference('3:16')).toBeNull();
    });
  });

  describe('BIBLE_BOOK_PATTERNS', () => {
    it('has 66 English books (plus "psalm" variant)', () => {
      // 66 standard books + 1 "psalm" variant = 67
      expect(BIBLE_BOOK_PATTERNS.en.length).toBe(67);
    });

    it('has 66 Korean books', () => {
      expect(BIBLE_BOOK_PATTERNS.ko.length).toBe(66);
    });

    it('English books are lowercase', () => {
      BIBLE_BOOK_PATTERNS.en.forEach((book) => {
        expect(book).toBe(book.toLowerCase());
      });
    });
  });
});
