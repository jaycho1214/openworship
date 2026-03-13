/* eslint-disable no-console */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Library,
  Loader2,
  X,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../components/ui/hover-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { cn } from '../../lib/utils';
import SongEditor from './SongEditor';
import AddSongDialog from './AddSongDialog';
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

interface LibrarySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function LibrarySidebar({
  isOpen,
  onToggle,
}: LibrarySidebarProps) {
  const { t } = useTranslation();
  const { currentSessionId } = useSession();
  const { currentSetlist, addItem } = useSetlist();

  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<LibrarySong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editingLibrarySong, setEditingLibrarySong] =
    useState<LibrarySong | null>(null);
  const [draggedSong, setDraggedSong] = useState<LibrarySong | null>(null);
  const [songToDelete, setSongToDelete] = useState<string | null>(null);

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
    if (isOpen) {
      loadSongs();
    }
  }, [isOpen, loadSongs]);

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

  // Delete song with confirmation
  const handleConfirmDelete = async () => {
    if (!songToDelete) return;
    try {
      const result = await window.electron.library.delete(songToDelete);
      if (result.success) {
        loadSongs();
      }
    } catch (error) {
      console.error('Failed to delete song:', error);
    }
    setSongToDelete(null);
  };

  // Import single song to session (use addItem directly since song is already in library)
  const handleImportToSession = (song: LibrarySong) => {
    if (!currentSessionId) return;
    addItem({ type: 'song', songId: song.id });
  };

  // Open edit dialog
  const handleEditSong = (song: LibrarySong) => {
    setEditingLibrarySong(song);
    const songForEditor: Song = {
      id: song.id,
      title: song.title,
      rawLyrics: song.lyrics,
      slides: parseLyricsToSlides(song.lyrics),
      createdAt: song.createdAt,
      updatedAt: song.updatedAt,
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

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, song: LibrarySong) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'library-song',
        song,
      }),
    );
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedSong(song);
  };

  const handleDragEnd = () => {
    setDraggedSong(null);
  };

  // Add songs to library and optionally to a session
  const handleAddToLibrary = async (
    songsToAdd: { title: string; lyrics: string }[],
    sessionTarget: 'library-only' | 'new-session' | string,
    newSessionName?: string,
  ) => {
    try {
      const addedSongIds: string[] = [];

      // Add songs to library
      for (const song of songsToAdd) {
        const result = await window.electron.library.add({
          title: song.title,
          lyrics: song.lyrics,
          categories: [],
          tags: [],
        });

        // Collect the song ID if successfully added
        if (result.success && result.data?.id) {
          addedSongIds.push(result.data.id);
        }
      }

      await loadSongs();

      // Handle session target
      if (sessionTarget === 'library-only' || addedSongIds.length === 0) {
        // Just library, no session
        return;
      }

      let targetSessionId: string | null = null;

      if (sessionTarget === 'new-session' && newSessionName) {
        // Create a new session
        const createResult =
          await window.electron.session.create(newSessionName);
        if (createResult.success && createResult.data?.id) {
          targetSessionId = createResult.data.id;
        }
      } else if (
        sessionTarget !== 'library-only' &&
        sessionTarget !== 'new-session'
      ) {
        // Use existing session ID
        targetSessionId = sessionTarget;
      }

      // Add songs to the target session
      if (targetSessionId) {
        // If target is the current session, use context method
        if (targetSessionId === currentSessionId) {
          for (const songId of addedSongIds) {
            await addItem({ type: 'song', songId });
          }
        } else {
          // Add to a different session via IPC
          for (const songId of addedSongIds) {
            await window.electron.sessionItem.add(targetSessionId, {
              type: 'song',
              songId,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to add songs to library:', error);
    }
  };

  const hasSession = !!currentSessionId;

  return (
    <>
      {/* Collapsed state - clickable bar */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="flex-shrink-0 border-r border-border bg-card/30 w-10 flex flex-col items-center py-4 hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className="mt-6 flex-1 flex items-start">
            <span className="[writing-mode:vertical-rl] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t('library')}
            </span>
          </div>
        </button>
      )}

      {/* Expanded state */}
      <div
        className={cn(
          'flex-shrink-0 border-r border-border bg-card/30 transition-all duration-300 ease-in-out overflow-hidden',
          isOpen ? 'w-72' : 'w-0',
        )}
      >
        <div className="w-72 flex flex-col h-full">
          {/* Header - standardized h-12 */}
          <div className="h-12 px-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t('songLibrary')}
              </h2>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {songs.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                className="h-7 px-2 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {t('add')}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-border">
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
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? t('noSongsFound') : t('noLibrarySongs')}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filteredSongs.map((song) => {
                  const isInSession = sessionSongIds.has(song.id);
                  const isDragging = draggedSong?.id === song.id;
                  const lyricsPreview = song.lyrics
                    .split('\n')
                    .slice(0, 8)
                    .join('\n');

                  return (
                    <HoverCard
                      key={song.id}
                      openDelay={400}
                      closeDelay={100}
                      open={draggedSong ? false : undefined}
                    >
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <HoverCardTrigger asChild>
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, song)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                'group flex items-center gap-2 px-2 py-2 rounded-md transition-all duration-150 cursor-grab active:cursor-grabbing',
                                isDragging
                                  ? 'opacity-50 bg-accent/20'
                                  : 'hover:bg-muted/70',
                              )}
                            >
                              {/* Drag handle */}
                              <div className="flex-shrink-0 opacity-30 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>

                              {/* Song info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium text-foreground truncate">
                                    {song.title}
                                  </p>
                                  {isInSession && (
                                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                  {song.lyrics.split('\n')[0]}
                                </p>
                              </div>
                            </div>
                          </HoverCardTrigger>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem
                            onClick={() => handleImportToSession(song)}
                            disabled={!hasSession || isInSession}
                            className="gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            {t('addToSession')}
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => handleEditSong(song)}
                            className="gap-2"
                          >
                            <Pencil className="w-4 h-4" />
                            {t('editSong')}
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => setSongToDelete(song.id)}
                            className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('deleteSong')}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                      <HoverCardContent
                        side="right"
                        align="start"
                        className="w-64 p-3"
                      >
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">
                            {song.title}
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                            {lyricsPreview}
                            {song.lyrics.split('\n').length > 8 && '...'}
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Hint */}
          <div className="p-2 border-t border-border bg-muted/30">
            <p className="text-[10px] text-muted-foreground text-center">
              {t('dragToAdd')}
            </p>
          </div>
        </div>
      </div>

      {/* Song Editor Dialog */}
      <SongEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        song={editingSong}
        onSave={handleEditorSave}
      />

      {/* Add Song Dialog */}
      <AddSongDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddToLibrary={handleAddToLibrary}
        currentSessionId={currentSessionId}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={songToDelete !== null}
        onOpenChange={(dialogOpen) => {
          if (!dialogOpen) setSongToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteSong')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteSongDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
