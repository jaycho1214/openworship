/* eslint-disable no-console */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import {
  BibleTranslation,
  BibleBook,
  BibleVerse,
  BibleDownloadInfo,
  BibleDisplayMode,
} from '../../../../shared/types/bible';
import { Slide } from '../../../../shared/types/song';

import { getElectron } from '../../../shared/hooks/useElectron';

interface BibleContextType {
  // State
  translations: BibleTranslation[];
  selectedTranslation: BibleTranslation | null;
  books: BibleBook[];
  selectedBook: BibleBook | null;
  selectedChapter: number | null;
  verses: BibleVerse[];
  verseCount: number;
  availableBibles: BibleDownloadInfo[];
  isLoading: boolean;
  importProgress: { progress: number; message: string } | null;

  // Actions
  selectTranslation: (translation: BibleTranslation | null) => void;
  selectBook: (book: BibleBook | null) => void;
  selectChapter: (chapter: number | null) => void;
  getVersesRange: (
    bookId: string,
    chapter: number,
    startVerse: number,
    endVerse: number,
  ) => Promise<BibleVerse[]>;
  getVerseCount: (bookId: string, chapter: number) => Promise<number>;
  versesToSlides: (
    bookId: string,
    bookName: string,
    chapter: number,
    startVerse: number,
    endVerse: number,
    displayMode: BibleDisplayMode,
  ) => Promise<Slide[]>;
  searchVerses: (
    translationId: string,
    query: string,
    limit?: number,
  ) => Promise<BibleVerse[]>;
  importFromFile: () => Promise<BibleTranslation | null>;
  downloadAndImport: (bibleId: string) => Promise<BibleTranslation | null>;
  deleteTranslation: (id: string) => Promise<boolean>;
}

const BibleContext = createContext<BibleContextType | null>(null);

export function useBible() {
  const context = useContext(BibleContext);
  if (!context) {
    throw new Error('useBible must be used within a BibleProvider');
  }
  return context;
}

interface BibleProviderProps {
  children: ReactNode;
}

export function BibleProvider({ children }: BibleProviderProps) {
  const [translations, setTranslations] = useState<BibleTranslation[]>([]);
  const [selectedTranslation, setSelectedTranslation] =
    useState<BibleTranslation | null>(null);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapterState] = useState<number | null>(
    null,
  );
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [verseCount, setVerseCount] = useState<number>(0);
  const [availableBibles, setAvailableBibles] = useState<BibleDownloadInfo[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    progress: number;
    message: string;
  } | null>(null);

  // Load translations on mount
  useEffect(() => {
    loadTranslations();
    loadAvailableBibles();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  // Subscribe to import progress events
  useEffect(() => {
    const electron = getElectron();
    if (!electron?.bible?.onImportProgress) return;

    const unsubscribe = electron.bible.onImportProgress(
      (data: { progress: number; message: string }) => {
        setImportProgress(data);
        if (data.progress >= 100) {
          // Clear progress after completion
          setTimeout(() => setImportProgress(null), 2000);
        }
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, []);

  const loadTranslations = useCallback(async () => {
    const electron = getElectron();
    if (!electron?.bible) return;

    try {
      setIsLoading(true);
      const result = await electron.bible.getTranslations();
      if (result.success && result.data) {
        setTranslations(result.data);
        // Auto-select first translation if none selected
        if (result.data.length > 0 && !selectedTranslation) {
          setSelectedTranslation(result.data[0]);
          await loadBooks(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadBooks called inside, not a dep
  }, [selectedTranslation]);

  const selectTranslation = useCallback(
    (translation: BibleTranslation | null) => {
      setSelectedTranslation(translation);
      setBooks([]);
      setSelectedBook(null);
      setSelectedChapterState(null);
      setVerses([]);
      setVerseCount(0);

      if (translation) {
        loadBooks(translation.id);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadBooks is stable
    [],
  );

  const loadBooks = useCallback(async (translationId: string) => {
    const electron = getElectron();
    if (!electron?.bible) return;

    try {
      setIsLoading(true);
      const result = await electron.bible.getBooks(translationId);
      if (result.success && result.data) {
        setBooks(result.data);
      }
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectBook = useCallback((book: BibleBook | null) => {
    setSelectedBook(book);
    setSelectedChapterState(null);
    setVerses([]);
    setVerseCount(0);
  }, []);

  const selectChapter = useCallback(
    async (chapter: number | null) => {
      setSelectedChapterState(chapter);
      setVerses([]);
      setVerseCount(0);

      if (chapter !== null && selectedBook) {
        await loadVerses(selectedBook.id, chapter);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadVerses is stable
    [selectedBook],
  );

  const loadVerses = useCallback(async (bookId: string, chapter: number) => {
    const electron = getElectron();
    if (!electron?.bible) return;

    try {
      setIsLoading(true);
      const [versesResult, countResult] = await Promise.all([
        electron.bible.getVerses(bookId, chapter),
        electron.bible.getVerseCount(bookId, chapter),
      ]);

      if (versesResult.success && versesResult.data) {
        setVerses(versesResult.data);
      }
      if (countResult.success && countResult.data !== undefined) {
        setVerseCount(countResult.data);
      }
    } catch (error) {
      console.error('Failed to load verses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVersesRange = useCallback(
    async (
      bookId: string,
      chapter: number,
      startVerse: number,
      endVerse: number,
    ): Promise<BibleVerse[]> => {
      const electron = getElectron();
      if (!electron?.bible) return [];

      try {
        const result = await electron.bible.getVersesRange(
          bookId,
          chapter,
          startVerse,
          endVerse,
        );
        return result.success && result.data ? result.data : [];
      } catch (error) {
        console.error('Failed to get verses range:', error);
        return [];
      }
    },
    [],
  );

  const getVerseCountFn = useCallback(
    async (bookId: string, chapter: number): Promise<number> => {
      const electron = getElectron();
      if (!electron?.bible) return 0;

      try {
        const result = await electron.bible.getVerseCount(bookId, chapter);
        return result.success && result.data !== undefined ? result.data : 0;
      } catch (error) {
        console.error('Failed to get verse count:', error);
        return 0;
      }
    },
    [],
  );

  const versesToSlides = useCallback(
    async (
      bookId: string,
      bookName: string,
      chapter: number,
      startVerse: number,
      endVerse: number,
      displayMode: BibleDisplayMode,
    ): Promise<Slide[]> => {
      const electron = getElectron();
      if (!electron?.bible) return [];

      try {
        const result = await electron.bible.versesToSlides(
          bookId,
          bookName,
          chapter,
          startVerse,
          endVerse,
          displayMode,
        );
        return result.success && result.data ? result.data : [];
      } catch (error) {
        console.error('Failed to convert verses to slides:', error);
        return [];
      }
    },
    [],
  );

  const searchVerses = useCallback(
    async (
      translationId: string,
      query: string,
      limit?: number,
    ): Promise<BibleVerse[]> => {
      const electron = getElectron();
      if (!electron?.bible) return [];

      try {
        const result = await electron.bible.searchVerses(
          translationId,
          query,
          limit,
        );
        return result.success && result.data ? result.data : [];
      } catch (error) {
        console.error('Failed to search verses:', error);
        return [];
      }
    },
    [],
  );

  const importFromFile =
    useCallback(async (): Promise<BibleTranslation | null> => {
      const electron = getElectron();
      if (!electron?.bible) return null;

      try {
        setIsLoading(true);
        const result = await electron.bible.importFromFile();
        if (result.success && result.data && !result.canceled) {
          await loadTranslations();
          return result.data;
        }
        return null;
      } catch (error) {
        console.error('Failed to import Bible:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [loadTranslations]);

  const downloadAndImport = useCallback(
    async (bibleId: string): Promise<BibleTranslation | null> => {
      const electron = getElectron();
      if (!electron?.bible) return null;

      try {
        setIsLoading(true);
        const result = await electron.bible.downloadAndImport(bibleId);
        if (result.success && result.data) {
          await loadTranslations();
          return result.data;
        }
        return null;
      } catch (error) {
        console.error('Failed to download and import Bible:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [loadTranslations],
  );

  const deleteTranslation = useCallback(
    async (id: string): Promise<boolean> => {
      const electron = getElectron();
      if (!electron?.bible) return false;

      try {
        setIsLoading(true);
        const result = await electron.bible.deleteTranslation(id);
        if (result.success && result.data) {
          // Reload translations
          await loadTranslations();
          // Clear selection if deleted translation was selected
          if (selectedTranslation?.id === id) {
            setSelectedTranslation(null);
            setBooks([]);
            setSelectedBook(null);
            setSelectedChapterState(null);
            setVerses([]);
            setVerseCount(0);
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to delete translation:', error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [loadTranslations, selectedTranslation],
  );

  const loadAvailableBibles = useCallback(async () => {
    const electron = getElectron();
    if (!electron?.bible) return;

    try {
      const result = await electron.bible.getAvailableBibles();
      if (result.success && result.data) {
        setAvailableBibles(result.data);
      }
    } catch (error) {
      console.error('Failed to load available Bibles:', error);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      // State
      translations,
      selectedTranslation,
      books,
      selectedBook,
      selectedChapter,
      verses,
      verseCount,
      availableBibles,
      isLoading,
      importProgress,

      // Actions
      selectTranslation,
      selectBook,
      selectChapter,
      getVersesRange,
      getVerseCount: getVerseCountFn,
      versesToSlides,
      searchVerses,
      importFromFile,
      downloadAndImport,
      deleteTranslation,
    }),
    [
      translations,
      selectedTranslation,
      books,
      selectedBook,
      selectedChapter,
      verses,
      verseCount,
      availableBibles,
      isLoading,
      importProgress,
      selectTranslation,
      selectBook,
      selectChapter,
      getVersesRange,
      getVerseCountFn,
      versesToSlides,
      searchVerses,
      importFromFile,
      downloadAndImport,
      deleteTranslation,
    ],
  );

  return (
    <BibleContext.Provider value={contextValue}>
      {children}
    </BibleContext.Provider>
  );
}
