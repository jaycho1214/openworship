/**
 * Bible reference parsing utilities
 * Shared between BibleVersePicker and AddContentDialog
 */

export interface ParsedBibleRef {
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
}

export const BIBLE_BOOK_PATTERNS = {
  en: [
    'genesis',
    'exodus',
    'leviticus',
    'numbers',
    'deuteronomy',
    'joshua',
    'judges',
    'ruth',
    '1 samuel',
    '2 samuel',
    '1 kings',
    '2 kings',
    '1 chronicles',
    '2 chronicles',
    'ezra',
    'nehemiah',
    'esther',
    'job',
    'psalms',
    'psalm',
    'proverbs',
    'ecclesiastes',
    'song of solomon',
    'isaiah',
    'jeremiah',
    'lamentations',
    'ezekiel',
    'daniel',
    'hosea',
    'joel',
    'amos',
    'obadiah',
    'jonah',
    'micah',
    'nahum',
    'habakkuk',
    'zephaniah',
    'haggai',
    'zechariah',
    'malachi',
    'matthew',
    'mark',
    'luke',
    'john',
    'acts',
    'romans',
    '1 corinthians',
    '2 corinthians',
    'galatians',
    'ephesians',
    'philippians',
    'colossians',
    '1 thessalonians',
    '2 thessalonians',
    '1 timothy',
    '2 timothy',
    'titus',
    'philemon',
    'hebrews',
    'james',
    '1 peter',
    '2 peter',
    '1 john',
    '2 john',
    '3 john',
    'jude',
    'revelation',
  ],
  ko: [
    '창세기',
    '출애굽기',
    '레위기',
    '민수기',
    '신명기',
    '여호수아',
    '사사기',
    '룻기',
    '사무엘상',
    '사무엘하',
    '열왕기상',
    '열왕기하',
    '역대상',
    '역대하',
    '에스라',
    '느헤미야',
    '에스더',
    '욥기',
    '시편',
    '잠언',
    '전도서',
    '아가',
    '이사야',
    '예레미야',
    '예레미야애가',
    '에스겔',
    '다니엘',
    '호세아',
    '요엘',
    '아모스',
    '오바댜',
    '요나',
    '미가',
    '나훔',
    '하박국',
    '스바냐',
    '학개',
    '스가랴',
    '말라기',
    '마태복음',
    '마가복음',
    '누가복음',
    '요한복음',
    '사도행전',
    '로마서',
    '고린도전서',
    '고린도후서',
    '갈라디아서',
    '에베소서',
    '빌립보서',
    '골로새서',
    '데살로니가전서',
    '데살로니가후서',
    '디모데전서',
    '디모데후서',
    '디도서',
    '빌레몬서',
    '히브리서',
    '야고보서',
    '베드로전서',
    '베드로후서',
    '요한1서',
    '요한2서',
    '요한3서',
    '유다서',
    '요한계시록',
  ],
};

/**
 * Parse a Bible reference string into structured data.
 * Supports patterns like "John 3:16", "Genesis 1:1-10", "1 John 3:16-18"
 */
export function parseBibleReference(input: string): ParsedBibleRef | null {
  const trimmed = input.trim();

  // Pattern: BookName Chapter:Verse or BookName Chapter:StartVerse-EndVerse
  const regex =
    /^([\p{L}\d\s]+?)\s*(\d+)\s*[:：]\s*(\d+)(?:\s*[-–]\s*(\d+))?$/u;
  const match = trimmed.match(regex);

  if (!match) return null;

  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;

  const allBooks = [...BIBLE_BOOK_PATTERNS.en, ...BIBLE_BOOK_PATTERNS.ko];
  const normalizedBookName = bookName.toLowerCase();
  const isValidBook = allBooks.some(
    (book) =>
      book.toLowerCase() === normalizedBookName ||
      book.toLowerCase().startsWith(normalizedBookName),
  );

  if (!isValidBook) return null;

  return { bookName, chapter, startVerse, endVerse };
}
