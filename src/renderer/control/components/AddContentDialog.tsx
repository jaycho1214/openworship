import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Music,
  BookOpen,
  Megaphone,
  Search,
  Plus,
  Loader2,
  Clock,
  X,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { BibleVersePicker } from './BibleVersePicker';
import {
  SetlistItemInput,
  BibleDisplayMode,
} from '../../../shared/types/setlistItem';
import { parseBibleReference } from '../../shared/utils/bibleUtils';
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

  // Announcement state
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  // Parse Bible reference from search query
  const parsedBibleRef = useMemo(
    () => parseBibleReference(searchQuery),
    [searchQuery],
  );

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
      setAnnouncementTitle('');
      setAnnouncementContent('');
      loadRecentItems();
    }
  }, [open, defaultTab]);

  // Focus search input when switching to search mode
  useEffect(() => {
    if (mode === 'search' && open) {
      // Small delay to let the DOM render
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
        await electron.settings.addRecentItem({
          type: 'song',
          songId,
          title,
        });
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
        await electron.settings.addRecentItem({
          type: 'bible',
          ...data,
        });
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
      onAddItem({
        type: 'song',
        songId: song.id,
      });
      // Save to recent items
      saveRecentSongItem(song.id, song.title);
      onOpenChange(false);
    },
    [onAddItem, onOpenChange, saveRecentSongItem],
  );

  // Add from recent item
  const handleAddRecentItem = useCallback(
    (item: RecentItem) => {
      if (item.type === 'song') {
        onAddItem({
          type: 'song',
          songId: item.songId,
        });
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

      // Save to recent items
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

  // Add announcement to setlist
  const handleAddAnnouncement = useCallback(() => {
    if (!announcementTitle.trim()) return;

    onAddItem({
      type: 'announcement',
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
    });
    onOpenChange(false);
  }, [announcementTitle, announcementContent, onAddItem, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 gap-0 overflow-hidden transition-all',
          mode === 'bible' ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-lg font-bold">
            {t('addToSetlist')}
          </DialogTitle>
        </DialogHeader>

        {/* Content Type Tabs */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
            {(
              [
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
                  icon: Megaphone,
                  labelKey: 'contentAnnouncement',
                  fallback: 'Note',
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = mode === tab.mode;
              return (
                <button
                  key={tab.mode}
                  onClick={() => setMode(tab.mode)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t(tab.labelKey, tab.fallback)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Song Search Mode */}
        {mode === 'search' && (
          <div className="px-5 pb-5">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={t(
                  'addContentSearchPlaceholder',
                  'Search songs or type Bible reference (e.g., John 3:16)...',
                )}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-11 text-base"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bible Reference Detection */}
            {parsedBibleRef && (
              <button
                onClick={() => setMode('bible')}
                className="w-full mb-3 flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {t('addContentBibleDetected', 'Bible verse detected')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {parsedBibleRef.bookName} {parsedBibleRef.chapter}:
                    {parsedBibleRef.startVerse}
                    {parsedBibleRef.endVerse !== parsedBibleRef.startVerse &&
                      `-${parsedBibleRef.endVerse}`}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}

            <ScrollArea className="h-[280px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-0.5">
                  {searchResults.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleAddSong(song)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent">
                        <Music className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate text-foreground">
                          {song.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {song.lyrics.split('\n')[0]}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground text-sm">
                    {t('noResults', 'No results found')}
                  </p>
                </div>
              ) : (
                /* Recent Songs Only */
                <div>
                  {recentSongs.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-2 px-1 mb-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t('addContentRecent', 'Recent')}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {recentSongs.slice(0, 5).map((item, index) => (
                          <button
                            key={`recent-song-${index}`}
                            onClick={() => handleAddRecentItem(item)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                          >
                            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent">
                              <Music className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-medium truncate text-foreground">
                                {item.title}
                              </p>
                            </div>
                            <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Search className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {t('searchToAdd', 'Search for a song to add')}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {t(
                          'addContentBibleHint',
                          'Or type a Bible reference like "John 3:16"',
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Bible Mode */}
        {mode === 'bible' && (
          <div className="px-5 pb-5">
            {/* Recent Bible references */}
            {recentBible.length > 0 && !parsedBibleRef && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-1 mb-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('addContentRecent', 'Recent')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentBible.slice(0, 4).map((item, index) => (
                    <button
                      key={`recent-bible-${index}`}
                      onClick={() => handleAddRecentItem(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                      {item.reference}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <BibleVersePicker
              onSelect={handleAddBible}
              onCancel={handleClose}
              initialBookName={parsedBibleRef?.bookName}
              initialChapter={parsedBibleRef?.chapter}
              initialStartVerse={parsedBibleRef?.startVerse}
              initialEndVerse={parsedBibleRef?.endVerse}
            />
          </div>
        )}

        {/* Announcement Mode */}
        {mode === 'announcement' && (
          <div className="px-5 pb-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">
                {t('announcementTitle', 'Title')}
              </Label>
              <Input
                id="announcement-title"
                placeholder={t(
                  'announcementTitlePlaceholder',
                  'Enter announcement title',
                )}
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcement-content">
                {t('announcementContent', 'Content')}
              </Label>
              <Textarea
                id="announcement-content"
                placeholder={t(
                  'announcementContentPlaceholder',
                  'Enter announcement content (optional)',
                )}
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'announcementHint',
                  'Separate paragraphs with blank lines for multiple slides',
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleAddAnnouncement}
                disabled={!announcementTitle.trim()}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('addAnnouncement', 'Add announcement')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
