/**
 * Bible Service for OpenWorship
 * Handles Bible import, storage, and retrieval
 */

import fs from 'fs';
import path from 'path';
import log from 'electron-log';
import { v4 as uuidv4 } from 'uuid';
import { app } from 'electron';
import {
  BibleImportData,
  BibleTranslation,
  BibleBook,
  BibleVerse,
  BibleDisplayMode,
  BibleDownloadInfo,
} from '../../shared/types/bible';
import { Slide } from '../../shared/types/song';
import {
  databaseService,
  DbBibleTranslation,
  DbBibleBook,
  DbBibleVerse,
} from './database';

// Built-in Bible translations available for download
// Using getbible.net API which provides public domain translations
export const AVAILABLE_BIBLES: BibleDownloadInfo[] = [
  {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    language: 'en',
    description: 'Public domain English translation (1769)',
    downloadUrl: 'https://api.getbible.net/v2/kjv.json',
    fileSize: '~5 MB',
    isPublicDomain: true,
  },
  {
    id: 'korean',
    name: '개역한글 (Korean Revised)',
    abbreviation: 'KRV',
    language: 'ko',
    description: '개역성경 1952/1961 (Public Domain)',
    downloadUrl: 'https://api.getbible.net/v2/korean.json',
    fileSize: '~4 MB',
    isPublicDomain: true,
  },
];

/**
 * Get the directory for storing Bible data
 */
export const getBibleDataPath = (): string => {
  const userDataPath = app.getPath('userData');
  const biblePath = path.join(userDataPath, 'bibles');
  if (!fs.existsSync(biblePath)) {
    fs.mkdirSync(biblePath, { recursive: true });
  }
  return biblePath;
};

/**
 * Import a Bible translation from JSON file
 */
export const importBibleFromFile = async (
  filePath: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<BibleTranslation> => {
  log.info('[BibleService] Importing Bible from:', filePath);

  // Read and parse the file
  onProgress?.(5, 'Reading file...');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  onProgress?.(10, 'Parsing JSON...');
  const data = JSON.parse(fileContent) as BibleImportData;

  return importBibleData(data, onProgress);
};

/**
 * Import a Bible translation from JSON data
 */
export const importBibleData = async (
  data: BibleImportData,
  onProgress?: (progress: number, message: string) => void,
): Promise<BibleTranslation> => {
  const translationId = uuidv4();

  // Validate data structure
  if (!data.name || !data.abbreviation || !data.language || !data.books) {
    throw new Error('Invalid Bible data format');
  }

  onProgress?.(15, 'Storing translation metadata...');

  // Add translation to database
  const dbTranslation = databaseService.addBibleTranslation({
    id: translationId,
    name: data.name,
    abbreviation: data.abbreviation,
    language: data.language,
    description: data.description,
  });

  // Process books and verses
  const totalBooks = data.books.length;
  const books: DbBibleBook[] = [];
  const allVerses: DbBibleVerse[] = [];

  for (let bookIndex = 0; bookIndex < data.books.length; bookIndex++) {
    const book = data.books[bookIndex];
    const bookId = uuidv4();
    const bookProgress = 20 + Math.floor((bookIndex / totalBooks) * 60);

    onProgress?.(bookProgress, `Processing ${book.name}...`);

    // Calculate chapter count
    const chapterCount = book.chapters.length;

    books.push({
      id: bookId,
      translationId,
      bookNumber: bookIndex + 1,
      name: book.name,
      abbreviation: book.abbreviation,
      chapterCount,
    });

    // Process chapters and verses
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        allVerses.push({
          id: uuidv4(),
          translationId,
          bookId,
          chapter: chapter.chapter,
          verse: verse.verse,
          text: verse.text.trim(),
        });
      }
    }
  }

  // Store books
  onProgress?.(80, 'Storing books...');
  databaseService.addBibleBooksBatch(books);

  // Store verses in batches for better performance
  onProgress?.(85, 'Storing verses...');
  const BATCH_SIZE = 1000;
  for (let i = 0; i < allVerses.length; i += BATCH_SIZE) {
    const batch = allVerses.slice(i, i + BATCH_SIZE);
    databaseService.addBibleVersesBatch(batch);
    const progress = 85 + Math.floor((i / allVerses.length) * 14);
    onProgress?.(
      progress,
      `Storing verses (${i + batch.length}/${allVerses.length})...`,
    );
  }

  onProgress?.(100, 'Import complete!');

  log.info(
    '[BibleService] Imported Bible:',
    data.name,
    `(${books.length} books, ${allVerses.length} verses)`,
  );

  return {
    id: dbTranslation.id,
    name: dbTranslation.name,
    abbreviation: dbTranslation.abbreviation,
    language: dbTranslation.language,
    description: dbTranslation.description,
    createdAt: dbTranslation.createdAt,
    updatedAt: dbTranslation.updatedAt,
  };
};

/**
 * Download and import a Bible from URL
 */
export const downloadAndImportBible = async (
  downloadInfo: BibleDownloadInfo,
  onProgress?: (progress: number, message: string) => void,
): Promise<BibleTranslation> => {
  log.info('[BibleService] Downloading Bible:', downloadInfo.name);

  onProgress?.(0, 'Downloading...');

  // Download the file
  const response = await fetch(downloadInfo.downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  onProgress?.(5, 'Processing download...');

  const text = await response.text();
  let data: BibleImportData;

  try {
    // Try parsing as our standard format first
    const parsed = JSON.parse(text);

    // Check if it's already in our expected format (has name, abbreviation, language, books)
    // If not, convert from external format
    if (parsed.name && parsed.abbreviation && parsed.language && parsed.books) {
      data = parsed as BibleImportData;
    } else {
      // It's in a different format, convert it
      data = convertExternalFormat(text, downloadInfo);
    }
  } catch {
    // Try to convert from external format
    data = convertExternalFormat(text, downloadInfo);
  }

  return importBibleData(data, (progress, message) => {
    // Adjust progress to account for download time
    onProgress?.(5 + Math.floor(progress * 0.95), message);
  });
};

/**
 * Convert external Bible JSON formats to our standard format
 */
const convertExternalFormat = (
  jsonText: string,
  downloadInfo: BibleDownloadInfo,
): BibleImportData => {
  const raw = JSON.parse(jsonText);

  // Handle getbible.net API format
  if (raw.books && Array.isArray(raw.books) && raw.books[0]?.chapters) {
    // Check if it's getbible format (has 'nr' property and nested chapters with verses)
    if (raw.books[0].nr !== undefined && raw.books[0].chapters[0]?.verses) {
      return convertGetBibleFormat(raw, downloadInfo);
    }
  }

  // Handle scrollmapper/bible_databases format (KJV)
  if (Array.isArray(raw) && raw[0]?.field) {
    return convertScrollmapperFormat(raw, downloadInfo);
  }

  // Handle peterkim/bible-korean format (KRV)
  if (raw.books && Array.isArray(raw.books)) {
    return convertPeterkimFormat(raw, downloadInfo);
  }

  // Assume it's already in our format
  return {
    name: downloadInfo.name,
    abbreviation: downloadInfo.abbreviation,
    language: downloadInfo.language,
    description: downloadInfo.description,
    books: raw.books || [],
  };
};

/**
 * Convert scrollmapper format to our standard format
 */
const convertScrollmapperFormat = (
  raw: any[],
  downloadInfo: BibleDownloadInfo,
): BibleImportData => {
  const bookNames = [
    'Genesis',
    'Exodus',
    'Leviticus',
    'Numbers',
    'Deuteronomy',
    'Joshua',
    'Judges',
    'Ruth',
    '1 Samuel',
    '2 Samuel',
    '1 Kings',
    '2 Kings',
    '1 Chronicles',
    '2 Chronicles',
    'Ezra',
    'Nehemiah',
    'Esther',
    'Job',
    'Psalms',
    'Proverbs',
    'Ecclesiastes',
    'Song of Solomon',
    'Isaiah',
    'Jeremiah',
    'Lamentations',
    'Ezekiel',
    'Daniel',
    'Hosea',
    'Joel',
    'Amos',
    'Obadiah',
    'Jonah',
    'Micah',
    'Nahum',
    'Habakkuk',
    'Zephaniah',
    'Haggai',
    'Zechariah',
    'Malachi',
    'Matthew',
    'Mark',
    'Luke',
    'John',
    'Acts',
    'Romans',
    '1 Corinthians',
    '2 Corinthians',
    'Galatians',
    'Ephesians',
    'Philippians',
    'Colossians',
    '1 Thessalonians',
    '2 Thessalonians',
    '1 Timothy',
    '2 Timothy',
    'Titus',
    'Philemon',
    'Hebrews',
    'James',
    '1 Peter',
    '2 Peter',
    '1 John',
    '2 John',
    '3 John',
    'Jude',
    'Revelation',
  ];

  // Group verses by book and chapter
  const booksMap = new Map<
    number,
    Map<number, { verse: number; text: string }[]>
  >();

  for (const row of raw) {
    const [book, chapter, verse, text] = row.field;
    const bookNum = parseInt(book, 10);
    const chapterNum = parseInt(chapter, 10);
    const verseNum = parseInt(verse, 10);

    if (!booksMap.has(bookNum)) {
      booksMap.set(bookNum, new Map());
    }
    const chaptersMap = booksMap.get(bookNum)!;

    if (!chaptersMap.has(chapterNum)) {
      chaptersMap.set(chapterNum, []);
    }
    chaptersMap.get(chapterNum)!.push({ verse: verseNum, text });
  }

  // Convert to our format
  const books = [];
  for (let bookNum = 1; bookNum <= 66; bookNum++) {
    const chaptersMap = booksMap.get(bookNum);
    if (!chaptersMap) continue;

    const chapters = [];
    const chapterNums = Array.from(chaptersMap.keys()).sort((a, b) => a - b);

    for (const chapterNum of chapterNums) {
      const verses = chaptersMap.get(chapterNum)!;
      verses.sort((a, b) => a.verse - b.verse);
      chapters.push({ chapter: chapterNum, verses });
    }

    books.push({
      name: bookNames[bookNum - 1] || `Book ${bookNum}`,
      chapters,
    });
  }

  return {
    name: downloadInfo.name,
    abbreviation: downloadInfo.abbreviation,
    language: downloadInfo.language,
    description: downloadInfo.description,
    books,
  };
};

/**
 * Convert peterkim/bible-korean format to our standard format
 */
const convertPeterkimFormat = (
  raw: any,
  downloadInfo: BibleDownloadInfo,
): BibleImportData => {
  const books = [];

  for (const book of raw.books) {
    const chapters = [];

    for (
      let chapterIndex = 0;
      chapterIndex < book.chapters.length;
      chapterIndex++
    ) {
      const chapterVerses = book.chapters[chapterIndex];
      const verses = [];

      for (
        let verseIndex = 0;
        verseIndex < chapterVerses.length;
        verseIndex++
      ) {
        verses.push({
          verse: verseIndex + 1,
          text: chapterVerses[verseIndex],
        });
      }

      chapters.push({
        chapter: chapterIndex + 1,
        verses,
      });
    }

    books.push({
      name: book.name,
      abbreviation: book.abbrev,
      chapters,
    });
  }

  return {
    name: downloadInfo.name,
    abbreviation: downloadInfo.abbreviation,
    language: downloadInfo.language,
    description: downloadInfo.description,
    books,
  };
};

/**
 * Convert getbible.net API format to our standard format
 * Format: { books: [{ nr, name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }
 */
const convertGetBibleFormat = (
  raw: any,
  downloadInfo: BibleDownloadInfo,
): BibleImportData => {
  const books = [];

  // Sort books by book number
  const sortedBooks = [...raw.books].sort(
    (a: any, b: any) => (a.nr || 0) - (b.nr || 0),
  );

  for (const book of sortedBooks) {
    const chapters = [];

    // Sort chapters by chapter number
    const sortedChapters = [...book.chapters].sort(
      (a: any, b: any) => (a.chapter || 0) - (b.chapter || 0),
    );

    for (const chapter of sortedChapters) {
      const verses = [];

      // Sort verses by verse number
      const sortedVerses = [...chapter.verses].sort(
        (a: any, b: any) => (a.verse || 0) - (b.verse || 0),
      );

      for (const verse of sortedVerses) {
        verses.push({
          verse: verse.verse,
          text: verse.text,
        });
      }

      chapters.push({
        chapter: chapter.chapter,
        verses,
      });
    }

    books.push({
      name: book.name,
      abbreviation: book.name.substring(0, 3).toUpperCase(),
      chapters,
    });
  }

  return {
    name: downloadInfo.name,
    abbreviation: downloadInfo.abbreviation,
    language: downloadInfo.language,
    description: downloadInfo.description,
    books,
  };
};

/**
 * Get all Bible translations
 */
export const getTranslations = (): BibleTranslation[] => {
  const translations = databaseService.getAllBibleTranslations();
  return translations.map(dbToTranslation);
};

/**
 * Get a specific translation
 */
export const getTranslation = (id: string): BibleTranslation | null => {
  const translation = databaseService.getBibleTranslationById(id);
  return translation ? dbToTranslation(translation) : null;
};

/**
 * Delete a translation
 */
export const deleteTranslation = (id: string): boolean => {
  return databaseService.deleteBibleTranslation(id);
};

/**
 * Get books for a translation
 */
export const getBooks = (translationId: string): BibleBook[] => {
  const books = databaseService.getBibleBooks(translationId);
  return books.map(dbToBook);
};

/**
 * Get a specific book
 */
export const getBook = (id: string): BibleBook | null => {
  const book = databaseService.getBibleBookById(id);
  return book ? dbToBook(book) : null;
};

/**
 * Get verses for a chapter
 */
export const getVerses = (bookId: string, chapter: number): BibleVerse[] => {
  const verses = databaseService.getBibleVerses(bookId, chapter);
  return verses.map(dbToVerse);
};

/**
 * Get verses in a range
 */
export const getVersesRange = (
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
): BibleVerse[] => {
  const verses = databaseService.getBibleVersesRange(
    bookId,
    chapter,
    startVerse,
    endVerse,
  );
  return verses.map(dbToVerse);
};

/**
 * Get verse count for a chapter
 */
export const getVerseCount = (bookId: string, chapter: number): number => {
  return databaseService.getBibleVerseCount(bookId, chapter);
};

/**
 * Search verses by text
 */
export const searchVerses = (
  translationId: string,
  query: string,
  limit?: number,
): BibleVerse[] => {
  const verses = databaseService.searchBibleVerses(translationId, query, limit);
  return verses.map(dbToVerse);
};

/**
 * Convert Bible verses to slides for projection
 */
export const versesToSlides = (
  verses: BibleVerse[],
  bookName: string,
  chapter: number,
  displayMode: BibleDisplayMode,
): Slide[] => {
  if (displayMode === 'one-per-slide') {
    // One verse per slide
    return verses.map((verse) => ({
      id: uuidv4(),
      lines: [verse.text, `${bookName} ${chapter}:${verse.verse}`],
      section: `${bookName} ${chapter}:${verse.verse}`,
    }));
  }
  // Range on one slide
  if (verses.length === 0) return [];

  const firstVerse = verses[0];
  const lastVerse = verses[verses.length - 1];
  const reference =
    firstVerse.verse === lastVerse.verse
      ? `${bookName} ${chapter}:${firstVerse.verse}`
      : `${bookName} ${chapter}:${firstVerse.verse}-${lastVerse.verse}`;

  // Combine all verse texts
  const combinedText = verses.map((v) => `${v.verse}. ${v.text}`).join(' ');

  return [
    {
      id: uuidv4(),
      lines: [combinedText, reference],
      section: reference,
    },
  ];
};

/**
 * Get available built-in Bible translations
 */
export const getAvailableBibles = (): BibleDownloadInfo[] => {
  return AVAILABLE_BIBLES;
};

// Helper functions for type conversion
const dbToTranslation = (db: DbBibleTranslation): BibleTranslation => ({
  id: db.id,
  name: db.name,
  abbreviation: db.abbreviation,
  language: db.language,
  description: db.description,
  createdAt: db.createdAt,
  updatedAt: db.updatedAt,
});

const dbToBook = (db: DbBibleBook): BibleBook => ({
  id: db.id,
  translationId: db.translationId,
  bookNumber: db.bookNumber,
  name: db.name,
  abbreviation: db.abbreviation,
  chapterCount: db.chapterCount,
});

const dbToVerse = (db: DbBibleVerse): BibleVerse => ({
  id: db.id,
  translationId: db.translationId,
  bookId: db.bookId,
  chapter: db.chapter,
  verse: db.verse,
  text: db.text,
});

// Export service
export const bibleService = {
  // Import
  importBibleFromFile,
  importBibleData,
  downloadAndImportBible,
  getAvailableBibles,
  getBibleDataPath,

  // Translations
  getTranslations,
  getTranslation,
  deleteTranslation,

  // Books
  getBooks,
  getBook,

  // Verses
  getVerses,
  getVersesRange,
  getVerseCount,
  searchVerses,

  // Slides
  versesToSlides,
};
