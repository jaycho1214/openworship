import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Library,
  Music,
  Loader2,
  X,
  BookOpen,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { cn } from '../../lib/utils';
import SongEditor from './SongEditor';
import { Song } from '../../shared/types/song';
import { parseLyricsToSlides } from '../../shared/utils/lyricsParser';
import { useSession, useSetlist } from '../context';

// Types
interface LibrarySong {
  id: string;
  title: string;
  lyrics: string;
  categories: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface LibraryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LibraryDrawer({
  open,
  onOpenChange,
}: LibraryDrawerProps) {
  const { t } = useTranslation();
  const { currentSessionId } = useSession();
  const { currentSetlist, addSong } = useSetlist();

  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<LibrarySong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<LibrarySong | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editingLibrarySong, setEditingLibrarySong] =
    useState<LibrarySong | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Get IDs of songs already in session
  const sessionSongIds = useMemo(() => {
    if (!currentSetlist) return new Set<string>();
    return new Set(currentSetlist.songs.map((s) => s.id));
  }, [currentSetlist]);

  // Load songs
  const loadSongs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.electron.library.getAll();
      if (result.success && result.data) {
        setSongs(result.data);
        setFilteredSongs(result.data);
      }
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadSongs();
      // Reset selection when drawer opens
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
    }
  }, [open, loadSongs]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs(songs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = songs.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        song.lyrics.toLowerCase().includes(query) ||
        song.categories.some((cat) => cat.toLowerCase().includes(query)) ||
        song.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
    setFilteredSongs(filtered);
  }, [searchQuery, songs]);

  // Delete song
  const handleDeleteSong = async (id: string) => {
    try {
      const result = await window.electron.library.delete(id);
      if (result.success) {
        if (selectedSong?.id === id) setSelectedSong(null);
        selectedIds.delete(id);
        setSelectedIds(new Set(selectedIds));
        loadSongs();
      }
    } catch (error) {
      console.error('Failed to delete song:', error);
    }
  };

  // Import single song to session
  const handleImportToSession = (song: LibrarySong) => {
    if (!currentSessionId) return;
    addSong(song.title, song.lyrics);
  };

  // Import multiple songs to session
  const handleImportSelected = () => {
    if (!currentSessionId || selectedIds.size === 0) return;

    const songsToImport = songs.filter((s) => selectedIds.has(s.id));
    songsToImport.forEach((song) => {
      addSong(song.title, song.lyrics);
    });

    // Clear selection after import
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);
  };

  // Toggle song selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);

    // Auto-enable multi-select mode when selecting
    if (newSelected.size > 0 && !isMultiSelectMode) {
      setIsMultiSelectMode(true);
    }
  };

  // Select all filtered songs
  const selectAll = () => {
    const newSelected = new Set(filteredSongs.map((s) => s.id));
    setSelectedIds(newSelected);
    setIsMultiSelectMode(true);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);
  };

  // Open edit dialog
  const handleEditSong = (song: LibrarySong) => {
    setEditingLibrarySong(song);
    const songForEditor: Song = {
      id: song.id,
      title: song.title,
      rawLyrics: song.lyrics,
      slides: parseLyricsToSlides(song.lyrics),
      createdAt: new Date(song.createdAt),
      updatedAt: new Date(song.updatedAt),
    };
    setEditingSong(songForEditor);
    setIsEditorOpen(true);
  };

  // Handle save from editor
  const handleEditorSave = async (songData: {
    title: string;
    lyrics: string;
  }) => {
    if (!editingLibrarySong) return;

    try {
      await window.electron.library.update(editingLibrarySong.id, {
        title: songData.title,
        lyrics: songData.lyrics,
      });
      loadSongs();
    } catch (error) {
      console.error('Failed to save song:', error);
    }
  };

  const hasSession = !!currentSessionId;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[400px] sm:max-w-[400px] p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Library className="w-4 h-4 text-muted-foreground" />
                <SheetTitle className="text-sm font-semibold">
                  {t('songLibrary')}
                </SheetTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {songs.length}
                </Badge>
              </div>
            </div>
          </SheetHeader>

          {/* Search + Multi-select controls */}
          <div className="p-4 space-y-3 border-b border-border">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchLibrary')}
                className="h-8 pl-8 pr-8 text-xs bg-muted/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={t('clearSearch')}
                  title={t('clearSearch')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Multi-select controls */}
            {filteredSongs.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 ? (
                    <>
                      <span className="text-muted-foreground">
                        {selectedIds.size}
                        {t('selectedCount')}
                      </span>
                      <button
                        onClick={clearSelection}
                        className="text-muted-foreground hover:text-foreground underline"
                      >
                        {t('cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={selectAll}
                      className="text-muted-foreground hover:text-foreground underline"
                    >
                      {t('selectAll')}
                    </button>
                  )}
                </div>
                {selectedIds.size > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            size="sm"
                            onClick={handleImportSelected}
                            disabled={!hasSession}
                            className="h-7 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {t('importSelected')} ({selectedIds.size})
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!hasSession && (
                        <TooltipContent>
                          <p>{t('noSessionSelected')}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>

          {/* Song List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              </div>
            ) : filteredSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? t('noSongsFound') : t('noLibrarySongs')}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredSongs.map((song) => {
                  const isSelected = selectedIds.has(song.id);
                  const isInSession = sessionSongIds.has(song.id);

                  return (
                    <div
                      key={song.id}
                      className={cn(
                        'group p-3 rounded-lg border transition-all duration-150',
                        isSelected
                          ? 'bg-accent border-accent-foreground/20'
                          : selectedSong?.id === song.id
                            ? 'bg-muted border-foreground/20'
                            : 'bg-transparent border-transparent hover:bg-muted/50 hover:border-border',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {/* Checkbox for multi-select */}
                        <div
                          className={cn(
                            'flex-shrink-0 transition-opacity pt-0.5',
                            isMultiSelectMode || isSelected
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100',
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(song.id)}
                            className="h-4 w-4"
                          />
                        </div>

                        {/* Song info */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() =>
                            setSelectedSong(
                              selectedSong?.id === song.id ? null : song,
                            )
                          }
                        >
                          <div className="flex items-center gap-2">
                            <Music className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-sm font-medium text-foreground truncate">
                              {song.title}
                            </p>
                            {isInSession && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 flex-shrink-0 gap-0.5"
                              >
                                <Check className="w-2.5 h-2.5" />
                                {t('inSession')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 pl-5">
                            {song.lyrics.split('\n')[0]}
                          </p>
                          {(song.categories.length > 0 ||
                            song.tags.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-2 pl-5">
                              {song.categories.slice(0, 2).map((cat) => (
                                <Badge
                                  key={cat}
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0"
                                >
                                  {cat}
                                </Badge>
                              ))}
                              {song.tags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    disabled={!hasSession || isInSession}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImportToSession(song);
                                    }}
                                    title={t('importToSession')}
                                    aria-label={t('importToSession')}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              {!hasSession && (
                                <TooltipContent>
                                  <p>{t('noSessionSelected')}</p>
                                </TooltipContent>
                              )}
                              {hasSession && isInSession && (
                                <TooltipContent>
                                  <p>{t('inSession')}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSong(song);
                            }}
                            title={t('edit')}
                            aria-label={t('edit')}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSong(song.id);
                            }}
                            title={t('delete')}
                            aria-label={t('delete')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Preview Panel */}
          {selectedSong && (
            <div className="border-t border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {selectedSong.title}
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          size="sm"
                          onClick={() => handleImportToSession(selectedSong)}
                          disabled={
                            !hasSession || sessionSongIds.has(selectedSong.id)
                          }
                          className="h-7 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {sessionSongIds.has(selectedSong.id)
                            ? t('inSession')
                            : t('addToSession')}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!hasSession && (
                      <TooltipContent>
                        <p>{t('noSessionSelected')}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              <ScrollArea className="h-32">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                  {selectedSong.lyrics}
                </pre>
              </ScrollArea>
            </div>
          )}

          {/* No session hint */}
          {!hasSession && (
            <div className="p-3 bg-muted/50 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                {t('noSessionSelected')}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Song Editor Dialog */}
      <SongEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        song={editingSong}
        onSave={handleEditorSave}
      />
    </>
  );
}
