import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  BookOpen,
  Search,
  ChevronDown,
  X,
  BookMarked,
  Type,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { useBible } from '../context';
import { BibleDisplayMode } from '../../../shared/types/bible';
import { Slide } from '../../../shared/types/song';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  ParsedBibleRef,
  parseBibleReference,
} from '../../shared/utils/bibleUtils';
import { cn } from '../../lib/utils';

// Extended slide with per-slide font size
interface EditableSlide extends Slide {
  customFontSize?: number;
  isDeleted?: boolean;
}

interface BibleVersePickerProps {
  onSelect?: (selection: {
    translationId: string;
    translationName: string;
    bookId: string;
    bookName: string;
    chapter: number;
    startVerse: number;
    endVerse: number;
    displayMode: BibleDisplayMode;
    slides: Slide[];
  }) => void;
  onCancel?: () => void;
  initialBookName?: string;
  initialChapter?: number;
  initialStartVerse?: number;
  initialEndVerse?: number;
}

export function BibleVersePicker({
  onSelect,
  onCancel,
  initialBookName,
  initialChapter,
  initialStartVerse,
  initialEndVerse,
}: BibleVersePickerProps) {
  const { t } = useTranslation();
  const {
    translations,
    selectedTranslation,
    books,
    selectedBook,
    selectedChapter,
    verseCount,
    isLoading,
    selectTranslation,
    selectBook,
    selectChapter,
    versesToSlides,
  } = useBible();

  const [startVerse, setStartVerse] = useState<number>(1);
  const [endVerse, setEndVerse] = useState<number>(1);
  const [displayMode, setDisplayMode] =
    useState<BibleDisplayMode>('one-per-slide');
  const [editableSlides, setEditableSlides] = useState<EditableSlide[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Quick reference input state
  const [quickRef, setQuickRef] = useState('');
  const [parsedRef, setParsedRef] = useState<ParsedBibleRef | null>(null);

  // Book search state
  const [bookSearchOpen, setBookSearchOpen] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const bookSearchRef = useRef<HTMLInputElement>(null);

  // Selected slide for editing
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(
    null,
  );

  // Generate chapter options
  const chapterOptions = useMemo(() => {
    if (!selectedBook) return [];
    return Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1);
  }, [selectedBook]);

  // Filter books based on search
  const filteredBooks = useMemo(() => {
    if (!bookSearchQuery.trim()) return books;
    const query = bookSearchQuery.toLowerCase();
    return books.filter((book) => book.name.toLowerCase().includes(query));
  }, [books, bookSearchQuery]);

  // Split books into Old and New Testament (39 OT, 27 NT)
  const { oldTestament, newTestament } = useMemo(() => {
    const ot = filteredBooks.filter((book) => book.bookNumber <= 39);
    const nt = filteredBooks.filter((book) => book.bookNumber > 39);
    return { oldTestament: ot, newTestament: nt };
  }, [filteredBooks]);

  // Active (non-deleted) slides
  const activeSlides = useMemo(
    () => editableSlides.filter((s) => !s.isDeleted),
    [editableSlides],
  );

  // Parse quick reference input
  useEffect(() => {
    const parsed = parseBibleReference(quickRef);
    setParsedRef(parsed);
  }, [quickRef]);

  // Apply quick reference
  const applyQuickRef = useCallback(() => {
    if (!parsedRef || books.length === 0) return;

    const normalizedBookName = parsedRef.bookName.toLowerCase();
    const matchingBook = books.find(
      (book) =>
        book.name.toLowerCase() === normalizedBookName ||
        book.name.toLowerCase().startsWith(normalizedBookName),
    );

    if (matchingBook) {
      selectBook(matchingBook);
    }
  }, [parsedRef, books, selectBook]);

  // Auto-select book from initial value
  useEffect(() => {
    if (initialBookName && books.length > 0 && !selectedBook) {
      const normalizedInitial = initialBookName.toLowerCase();
      const matchingBook = books.find(
        (book) =>
          book.name.toLowerCase() === normalizedInitial ||
          book.name.toLowerCase().startsWith(normalizedInitial),
      );
      if (matchingBook) {
        selectBook(matchingBook);
      }
    }
  }, [initialBookName, books, selectedBook, selectBook]);

  // Auto-select chapter from initial value or parsed ref
  useEffect(() => {
    const targetChapter = parsedRef?.chapter || initialChapter;
    if (targetChapter && selectedBook && !selectedChapter) {
      if (targetChapter <= selectedBook.chapterCount) {
        selectChapter(targetChapter);
      }
    }
  }, [
    initialChapter,
    parsedRef?.chapter,
    selectedBook,
    selectedChapter,
    selectChapter,
  ]);

  // Reset verses when chapter changes, or use initial/parsed values
  useEffect(() => {
    if (verseCount > 0) {
      const targetStart = parsedRef?.startVerse || initialStartVerse;
      const targetEnd = parsedRef?.endVerse || initialEndVerse;

      if (targetStart && targetEnd) {
        setStartVerse(Math.min(targetStart, verseCount));
        setEndVerse(Math.min(targetEnd, verseCount));
      } else {
        setStartVerse(1);
        setEndVerse(Math.min(verseCount, 5));
      }
    }
  }, [
    verseCount,
    selectedChapter,
    initialStartVerse,
    initialEndVerse,
    parsedRef?.startVerse,
    parsedRef?.endVerse,
  ]);

  // Update preview when selection changes
  useEffect(() => {
    const updatePreview = async () => {
      if (!selectedBook || !selectedChapter || !startVerse || !endVerse) {
        setEditableSlides([]);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const slides = await versesToSlides(
          selectedBook.id,
          selectedBook.name,
          selectedChapter,
          startVerse,
          endVerse,
          displayMode,
        );
        setEditableSlides(slides.map((s) => ({ ...s })));
        setSelectedSlideIndex(null);
      } catch (error) {
        console.error('Failed to load preview:', error);
        setEditableSlides([]);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const timer = setTimeout(updatePreview, 300);
    return () => clearTimeout(timer);
  }, [
    selectedBook,
    selectedChapter,
    startVerse,
    endVerse,
    displayMode,
    versesToSlides,
  ]);

  // Focus book search when opened
  useEffect(() => {
    if (bookSearchOpen && bookSearchRef.current) {
      bookSearchRef.current.focus();
    }
  }, [bookSearchOpen]);

  const handleAdd = () => {
    if (
      !selectedTranslation ||
      !selectedBook ||
      !selectedChapter ||
      !startVerse ||
      !endVerse
    ) {
      return;
    }

    // Filter out deleted slides and apply custom font sizes
    const finalSlides: Slide[] = activeSlides.map((slide) => {
      const { isDeleted: _isDeleted, customFontSize, ...rest } = slide;
      if (customFontSize) {
        return { ...rest, fontSize: customFontSize };
      }
      return rest;
    });

    onSelect?.({
      translationId: selectedTranslation.id,
      translationName: selectedTranslation.name,
      bookId: selectedBook.id,
      bookName: selectedBook.name,
      chapter: selectedChapter,
      startVerse,
      endVerse,
      displayMode,
      slides: finalSlides,
    });
  };

  const handleBookSelect = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (book) {
      selectBook(book);
      setBookSearchOpen(false);
      setBookSearchQuery('');
    }
  };

  // Slide editing functions
  const updateSlideFontSize = (index: number, fontSize: number | undefined) => {
    setEditableSlides((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, customFontSize: fontSize } : s,
      ),
    );
  };

  const deleteSlide = (index: number) => {
    setEditableSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, isDeleted: true } : s)),
    );
    if (selectedSlideIndex === index) {
      setSelectedSlideIndex(null);
    }
  };

  const restoreSlide = (index: number) => {
    setEditableSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, isDeleted: false } : s)),
    );
  };

  const isValid =
    selectedTranslation &&
    selectedBook &&
    selectedChapter &&
    startVerse &&
    endVerse &&
    startVerse <= endVerse &&
    activeSlides.length > 0;

  // Current reference display
  const currentReference = useMemo(() => {
    if (!selectedBook) return null;
    let ref = selectedBook.name;
    if (selectedChapter) {
      ref += ` ${selectedChapter}`;
      if (startVerse && endVerse) {
        ref +=
          startVerse === endVerse
            ? `:${startVerse}`
            : `:${startVerse}-${endVerse}`;
      }
    }
    return ref;
  }, [selectedBook, selectedChapter, startVerse, endVerse]);

  if (translations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">
          {t('noTranslations', 'No Bible translations installed')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('goToSettings', 'Go to Settings > Bible to import a translation')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Left Panel - Selection */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Quick reference input */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('bibleQuickRef', 'Quick reference')}
          </Label>
          <div className="relative">
            <BookMarked className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t(
                'bibleQuickRefPlaceholder',
                'Type reference (e.g., John 3:16)',
              )}
              value={quickRef}
              onChange={(e) => setQuickRef(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && parsedRef) {
                  e.preventDefault();
                  applyQuickRef();
                }
              }}
              className="pl-10 pr-20 h-10"
            />
            {parsedRef && (
              <Button
                size="sm"
                variant="secondary"
                onClick={applyQuickRef}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 text-xs"
              >
                {t('bibleApply', 'Apply')}
              </Button>
            )}
          </div>
          {parsedRef && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {parsedRef.bookName} {parsedRef.chapter}:{parsedRef.startVerse}
              {parsedRef.endVerse !== parsedRef.startVerse &&
                `-${parsedRef.endVerse}`}
            </p>
          )}
        </div>

        {/* Translation selector - compact */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">
            {t('translation', 'Translation')}
          </Label>
          <Select
            value={selectedTranslation?.id || ''}
            onValueChange={(value) => {
              const trans = translations.find((tr) => tr.id === value);
              if (trans) selectTranslation(trans);
            }}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue
                placeholder={t('selectTranslation', 'Select translation')}
              />
            </SelectTrigger>
            <SelectContent>
              {translations.map((trans) => (
                <SelectItem key={trans.id} value={trans.id}>
                  {trans.name} ({trans.abbreviation})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Book selector with search */}
        <div className="space-y-1.5">
          <Label className="text-sm">{t('book', 'Book')}</Label>
          <div className="relative">
            <button
              onClick={() => setBookSearchOpen(!bookSearchOpen)}
              disabled={!selectedTranslation || isLoading}
              className={cn(
                'w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-background text-sm',
                'hover:bg-accent hover:text-accent-foreground transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                bookSearchOpen && 'ring-2 ring-ring ring-offset-2',
              )}
            >
              <span
                className={cn(
                  !selectedBook && 'text-muted-foreground truncate',
                )}
              >
                {selectedBook?.name || t('selectBook', 'Select book')}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  bookSearchOpen && 'rotate-180',
                )}
              />
            </button>

            {/* Book search dropdown */}
            {bookSearchOpen && (
              <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-lg">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={bookSearchRef}
                      placeholder={t('bibleSearchBook', 'Search books...')}
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      className="pl-8 h-8"
                    />
                    {bookSearchQuery && (
                      <button
                        onClick={() => setBookSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <ScrollArea className="h-[200px]">
                  <div className="p-2 space-y-2">
                    {oldTestament.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                          {t('bibleOldTestament', 'Old Testament')}
                        </p>
                        <div className="grid grid-cols-3 gap-0.5">
                          {oldTestament.map((book) => (
                            <button
                              key={book.id}
                              onClick={() => handleBookSelect(book.id)}
                              className={cn(
                                'px-1.5 py-1 text-xs rounded text-left truncate transition-colors',
                                selectedBook?.id === book.id
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium'
                                  : 'hover:bg-muted text-foreground',
                              )}
                              title={book.name}
                            >
                              {book.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {newTestament.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                          {t('bibleNewTestament', 'New Testament')}
                        </p>
                        <div className="grid grid-cols-3 gap-0.5">
                          {newTestament.map((book) => (
                            <button
                              key={book.id}
                              onClick={() => handleBookSelect(book.id)}
                              className={cn(
                                'px-1.5 py-1 text-xs rounded text-left truncate transition-colors',
                                selectedBook?.id === book.id
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium'
                                  : 'hover:bg-muted text-foreground',
                              )}
                              title={book.name}
                            >
                              {book.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredBooks.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        {t('bibleNoBooks', 'No books found')}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        {/* Chapter grid */}
        {selectedBook && (
          <div className="space-y-1.5">
            <Label className="text-sm">
              {t('chapter', 'Chapter')}{' '}
              <span className="text-muted-foreground font-normal text-xs">
                ({selectedBook.chapterCount})
              </span>
            </Label>
            <ScrollArea className="h-[72px]">
              <div className="grid grid-cols-10 gap-0.5 pr-2">
                {chapterOptions.map((chapter) => (
                  <button
                    key={chapter}
                    onClick={() => selectChapter(chapter)}
                    disabled={isLoading}
                    className={cn(
                      'h-7 text-xs rounded transition-colors font-medium',
                      selectedChapter === chapter
                        ? 'bg-foreground text-background'
                        : 'bg-muted/50 hover:bg-muted text-foreground',
                      isLoading && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {chapter}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Verse range */}
        {selectedChapter && verseCount > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm">
              {t('bibleVerses', 'Verses')}{' '}
              <span className="text-muted-foreground font-normal text-xs">
                (1-{verseCount})
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={verseCount}
                value={startVerse}
                onChange={(e) => {
                  const v = Math.max(
                    1,
                    Math.min(parseInt(e.target.value, 10) || 1, verseCount),
                  );
                  setStartVerse(v);
                  if (v > endVerse) setEndVerse(v);
                }}
                className="h-8 w-16 text-center text-sm"
              />
              <span className="text-muted-foreground text-sm">—</span>
              <Input
                type="number"
                min={startVerse}
                max={verseCount}
                value={endVerse}
                onChange={(e) => {
                  const v = Math.max(
                    startVerse,
                    Math.min(
                      parseInt(e.target.value, 10) || startVerse,
                      verseCount,
                    ),
                  );
                  setEndVerse(v);
                }}
                className="h-8 w-16 text-center text-sm"
              />
              <div className="flex gap-1 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setStartVerse(1);
                    setEndVerse(Math.min(5, verseCount));
                  }}
                >
                  1-5
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setStartVerse(1);
                    setEndVerse(verseCount);
                  }}
                >
                  {t('bibleAllVerses', 'All')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Display mode */}
        <div className="space-y-1.5">
          <Label className="text-sm">{t('bibleDisplayMode', 'Display')}</Label>
          <RadioGroup
            value={displayMode}
            onValueChange={(value) => setDisplayMode(value as BibleDisplayMode)}
            className="flex gap-3"
          >
            <div className="flex items-center space-x-1.5">
              <RadioGroupItem
                value="one-per-slide"
                id="one-per-slide"
                className="h-3.5 w-3.5"
              />
              <Label
                htmlFor="one-per-slide"
                className="font-normal cursor-pointer text-xs"
              >
                {t('onePerSlide', 'One per slide')}
              </Label>
            </div>
            <div className="flex items-center space-x-1.5">
              <RadioGroupItem
                value="range-on-slide"
                id="range-on-slide"
                className="h-3.5 w-3.5"
              />
              <Label
                htmlFor="range-on-slide"
                className="font-normal cursor-pointer text-xs"
              >
                {t('rangeOnSlide', 'Range on one slide')}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              {t('cancel', 'Cancel')}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!isValid || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('addToSetlist', 'Add to setlist')}
          </Button>
        </div>
      </div>

      {/* Right Panel - Slide Preview & Editing */}
      <div className="w-[340px] border-l pl-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">
            {t('bibleSlides', 'Slides')}
          </Label>
          {currentReference && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {currentReference}
            </span>
          )}
        </div>

        {isLoadingPreview ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : editableSlides.length > 0 ? (
          <ScrollArea className="flex-1 -mr-4 pr-4">
            <div className="space-y-2">
              {editableSlides.map((slide, index) => {
                const isSelected = selectedSlideIndex === index;
                const isDeleted = slide.isDeleted;

                return (
                  <div
                    key={slide.id}
                    className={cn(
                      'group relative rounded-lg border p-2.5 transition-all cursor-pointer',
                      isDeleted
                        ? 'opacity-40 bg-muted/30 border-dashed'
                        : isSelected
                          ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20'
                          : 'hover:border-muted-foreground/30 hover:bg-muted/30',
                    )}
                    onClick={() =>
                      !isDeleted &&
                      setSelectedSlideIndex(isSelected ? null : index)
                    }
                  >
                    {/* Slide number badge */}
                    <div
                      className={cn(
                        'absolute -left-2 -top-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                        isDeleted
                          ? 'bg-muted text-muted-foreground line-through'
                          : 'bg-foreground text-background',
                      )}
                    >
                      {index + 1}
                    </div>

                    {/* Slide content */}
                    <div
                      className={cn(
                        'text-xs leading-relaxed',
                        isDeleted && 'line-through',
                      )}
                    >
                      {slide.lines.map((line, lineIdx) => (
                        <p key={lineIdx} className="truncate">
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Custom font size indicator */}
                    {slide.customFontSize && !isDeleted && (
                      <div className="absolute top-1.5 right-1.5">
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                          {slide.customFontSize}px
                        </span>
                      </div>
                    )}

                    {/* Delete/Restore button */}
                    <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isDeleted ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreSlide(index);
                              }}
                              className="p-1 rounded hover:bg-background"
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {t('bibleRestoreSlide', 'Restore slide')}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSlide(index);
                              }}
                              className="p-1 rounded hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {t('bibleRemoveSlide', 'Remove slide')}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Font size editor (when selected) */}
                    {isSelected && !isDeleted && (
                      <div
                        className="mt-2 pt-2 border-t border-amber-500/20 flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Type className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {t('slideFontSizeOverride', 'Font size')}
                        </span>
                        <Input
                          type="number"
                          min={12}
                          max={200}
                          placeholder={t('bibleDefault', 'Default')}
                          value={slide.customFontSize || ''}
                          onChange={(e) => {
                            const val = e.target.value
                              ? parseInt(e.target.value, 10)
                              : undefined;
                            updateSlideFontSize(index, val);
                          }}
                          className="h-6 w-16 text-xs text-center"
                        />
                        {slide.customFontSize && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              updateSlideFontSize(index, undefined)
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">
              {t('bibleSelectVerses', 'Select book, chapter, and verses')}
            </p>
          </div>
        )}

        {/* Slide count */}
        {activeSlides.length > 0 && (
          <div className="pt-2 mt-2 border-t text-xs text-muted-foreground text-center">
            {t('bibleSlidesCount', '{{count}} slides', {
              count: activeSlides.length,
            })}
            {editableSlides.length !== activeSlides.length && (
              <span className="text-amber-600 dark:text-amber-400 ml-1">
                ({editableSlides.length - activeSlides.length}{' '}
                {t('bibleRemoved', 'removed')})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
