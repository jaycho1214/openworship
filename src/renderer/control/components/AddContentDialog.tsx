import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Music,
  BookOpen,
  StickyNote,
  Search,
  Plus,
  Loader2,
  Clock,
  X,
} from 'lucide-react';
import { basename } from '../../shared/utils/fileHelpers';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { BibleVersePicker } from './BibleVersePicker';
import NoteForm, { NoteFormState, isNoteFormValid } from './NoteForm';
import {
  SetlistItemInput,
  BibleDisplayMode,
} from '../../../shared/types/setlistItem';
import { cn } from '../../lib/utils';

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

interface LibrarySong {
  id: string;
  title: string;
  lyrics: string;
}

// Recent item types
interface RecentSongItem {
  type: 'song';
  songId: string;
  title: string;
  addedAt: number;
}

interface RecentBibleItem {
  type: 'bible';
  reference: string;
  translationId: string;
  translationName: string;
  bookId: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  addedAt: number;
}

type RecentItem = RecentSongItem | RecentBibleItem;

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (input: SetlistItemInput) => void;
  defaultTab?: 'song' | 'bible' | 'announcement';
}

type ContentMode = 'search' | 'bible' | 'announcement';

const TABS = [
  {
    mode: 'search' as ContentMode,
    icon: Music,
    labelKey: 'contentSong',
    fallback: 'Song',
  },
  {
    mode: 'bible' as ContentMode,
    icon: BookOpen,
    labelKey: 'contentBible',
    fallback: 'Bible',
  },
  {
    mode: 'announcement' as ContentMode,
    icon: StickyNote,
    labelKey: 'contentAnnouncement',
    fallback: 'Note',
  },
] as const;

export function AddContentDialog({
  open,
  onOpenChange,
  onAddItem,
  defaultTab = 'song',
}: AddContentDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ContentMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LibrarySong[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Note state
  const defaultNoteState: NoteFormState = {
    content: '',
    contentType: 'text',
    displayMode: 'slide',
    overlayPosition: 'bottom',
    imagePath: undefined,
    imagePreview: null,
  };
  const [noteFormState, setNoteFormState] =
    useState<NoteFormState>(defaultNoteState);

  // Filter recent items by current mode
  const recentSongs = useMemo(
    () =>
      recentItems.filter(
        (item): item is RecentSongItem => item.type === 'song',
      ),
    [recentItems],
  );

  const recentBible = useMemo(
    () =>
      recentItems.filter(
        (item): item is RecentBibleItem => item.type === 'bible',
      ),
    [recentItems],
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setMode(
        defaultTab === 'announcement'
          ? 'announcement'
          : defaultTab === 'bible'
            ? 'bible'
            : 'search',
      );
      setSearchQuery('');
      setSearchResults([]);
      setNoteFormState(defaultNoteState);
      loadRecentItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load recent items when dialog opens
  }, [open, defaultTab]);

  // Focus search input when switching to search mode
  useEffect(() => {
    if (mode === 'search' && open) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [mode, open]);

  // Load recent items
  const loadRecentItems = useCallback(async () => {
    const electron = getElectron();
    if (!electron?.settings?.getRecentItems) return;

    try {
      const result = await electron.settings.getRecentItems();
      if (result.success && result.data) {
        setRecentItems(result.data);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Save recent item
  const saveRecentSongItem = useCallback(
    async (songId: string, title: string) => {
      const electron = getElectron();
      if (!electron?.settings?.addRecentItem) return;

      try {
        await electron.settings.addRecentItem({ type: 'song', songId, title });
      } catch {
        // Ignore errors
      }
    },
    [],
  );

  const saveRecentBibleItem = useCallback(
    async (data: {
      reference: string;
      translationId: string;
      translationName: string;
      bookId: string;
      bookName: string;
      chapter: number;
      startVerse: number;
      endVerse: number;
    }) => {
      const electron = getElectron();
      if (!electron?.settings?.addRecentItem) return;

      try {
        await electron.settings.addRecentItem({ type: 'bible', ...data });
      } catch {
        // Ignore errors
      }
    },
    [],
  );

  // Search songs
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const electron = getElectron();
    if (!electron?.library) return;

    setIsSearching(true);
    try {
      const result = await electron.library.search(query);
      if (result.success && result.data) {
        setSearchResults(result.data.slice(0, 15));
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Add song to setlist
  const handleAddSong = useCallback(
    (song: LibrarySong) => {
      onAddItem({ type: 'song', songId: song.id });
      saveRecentSongItem(song.id, song.title);
      onOpenChange(false);
    },
    [onAddItem, onOpenChange, saveRecentSongItem],
  );

  // Add from recent item
  const handleAddRecentItem = useCallback(
    (item: RecentItem) => {
      if (item.type === 'song') {
        onAddItem({ type: 'song', songId: item.songId });
      } else if (item.type === 'bible') {
        onAddItem({
          type: 'bible',
          translationId: item.translationId,
          translationName: item.translationName,
          bookId: item.bookId,
          bookName: item.bookName,
          chapter: item.chapter,
          startVerse: item.startVerse,
          endVerse: item.endVerse,
          displayMode: 'one-per-slide',
        });
      }
      onOpenChange(false);
    },
    [onAddItem, onOpenChange],
  );

  // Add Bible verses to setlist
  const handleAddBible = useCallback(
    (selection: {
      translationId: string;
      translationName: string;
      bookId: string;
      bookName: string;
      chapter: number;
      startVerse: number;
      endVerse: number;
      displayMode: BibleDisplayMode;
    }) => {
      onAddItem({
        type: 'bible',
        translationId: selection.translationId,
        translationName: selection.translationName,
        bookId: selection.bookId,
        bookName: selection.bookName,
        chapter: selection.chapter,
        startVerse: selection.startVerse,
        endVerse: selection.endVerse,
        displayMode: selection.displayMode,
      });

      const reference =
        selection.startVerse === selection.endVerse
          ? `${selection.bookName} ${selection.chapter}:${selection.startVerse}`
          : `${selection.bookName} ${selection.chapter}:${selection.startVerse}-${selection.endVerse}`;

      saveRecentBibleItem({
        reference,
        translationId: selection.translationId,
        translationName: selection.translationName,
        bookId: selection.bookId,
        bookName: selection.bookName,
        chapter: selection.chapter,
        startVerse: selection.startVerse,
        endVerse: selection.endVerse,
      });

      onOpenChange(false);
    },
    [onAddItem, onOpenChange, saveRecentBibleItem],
  );

  // Add note to setlist
  const handleAddAnnouncement = useCallback(() => {
    if (!isNoteFormValid(noteFormState)) return;

    const title =
      noteFormState.contentType === 'image'
        ? (noteFormState.imagePath
            ? basename(noteFormState.imagePath)
            : null) || t('contentAnnouncement', 'Note')
        : noteFormState.content.trim().split('\n')[0]?.substring(0, 50) ||
          t('contentAnnouncement', 'Note');

    onAddItem({
      type: 'announcement',
      title,
      content:
        noteFormState.contentType === 'image'
          ? noteFormState.imagePath || ''
          : noteFormState.content.trim(),
      displayMode: noteFormState.displayMode,
      contentType: noteFormState.contentType,
      imagePath: noteFormState.imagePath,
      overlayPosition: noteFormState.overlayPosition,
    });
    onOpenChange(false);
  }, [noteFormState, onAddItem, onOpenChange, t]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('p-0 gap-0', mode === 'bible' ? 'max-w-3xl' : 'max-w-md')}
      >
        {/* Compact header with inline tabs */}
        <div className="flex items-center gap-3 pl-4 pr-10 pt-3.5 pb-2.5">
          <DialogTitle className="text-sm font-semibold shrink-0">
            {t('addToSetlist')}
          </DialogTitle>
          <div className="flex gap-0.5 p-0.5 rounded-md bg-muted/60 ml-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = mode === tab.mode;
              return (
                <button
                  key={tab.mode}
                  onClick={() => setMode(tab.mode)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {t(tab.labelKey, tab.fallback)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Song Search Mode */}
        {mode === 'search' && (
          <div className="px-4 pb-4">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={t('searchSongs')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <ScrollArea className="h-[240px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div>
                  {searchResults.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleAddSong(song)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted transition-colors group"
                    >
                      <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent">
                        <Music className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {song.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {song.lyrics.split('\n')[0]}
                        </p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="flex items-center justify-center py-10">
                  <p className="text-muted-foreground text-sm">
                    {t('noResults', 'No results found')}
                  </p>
                </div>
              ) : recentSongs.length > 0 ? (
                <div>
                  <div className="flex items-center gap-1.5 px-2 mb-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('addContentRecent', 'Recent')}
                    </span>
                  </div>
                  {recentSongs.slice(0, 5).map((item, index) => (
                    <button
                      key={`recent-song-${index}`} // eslint-disable-line react/no-array-index-key -- recent items have no stable ID
                      onClick={() => handleAddRecentItem(item)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted transition-colors group"
                    >
                      <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent">
                        <Music className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <p className="flex-1 text-left text-sm font-medium truncate text-foreground">
                        {item.title}
                      </p>
                      <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-10">
                  <p className="text-sm text-muted-foreground">
                    {t('searchToAdd', 'Search for a song to add')}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Bible Mode */}
        {mode === 'bible' && (
          <div className="pb-4">
            {/* Recent Bible references */}
            {recentBible.length > 0 && (
              <div className="mb-3 px-4">
                <div className="flex items-center gap-1.5 px-1 mb-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('addContentRecent', 'Recent')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recentBible.slice(0, 4).map((item, index) => (
                    <button
                      key={`recent-bible-${index}`} // eslint-disable-line react/no-array-index-key -- recent items have no stable ID
                      onClick={() => handleAddRecentItem(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <BookOpen className="w-2.5 h-2.5" />
                      {item.reference}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="px-4">
              <BibleVersePicker
                onSelect={handleAddBible}
                onCancel={handleClose}
              />
            </div>
          </div>
        )}

        {/* Note Mode */}
        {mode === 'announcement' && (
          <div className="px-4 pb-4 space-y-3">
            <NoteForm
              state={noteFormState}
              onChange={setNoteFormState}
              autoFocusTextarea
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleAddAnnouncement}
                disabled={!isNoteFormValid(noteFormState)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t('add', 'Add')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
