import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import SongEditor from './SongEditor';
import { Song } from '../../shared/types/song';
import { parseLyricsToSlides } from '../../shared/utils/lyricsParser';

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

interface SongLibraryProps {
  onImportSong: (song: { title: string; lyrics: string }) => void;
  className?: string;
}

export default function SongLibrary({
  onImportSong,
  className,
}: SongLibraryProps) {
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<LibrarySong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<LibrarySong | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editingLibrarySong, setEditingLibrarySong] =
    useState<LibrarySong | null>(null);

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
    loadSongs();
  }, [loadSongs]);

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
        song.categories.some((c) => c.toLowerCase().includes(query)) ||
        song.tags.some((t) => t.toLowerCase().includes(query)),
    );
    setFilteredSongs(filtered);
  }, [searchQuery, songs]);

  // Delete song
  const handleDeleteSong = async (id: string) => {
    try {
      const result = await window.electron.library.delete(id);
      if (result.success) {
        if (selectedSong?.id === id) setSelectedSong(null);
        loadSongs();
      }
    } catch (error) {
      console.error('Failed to delete song:', error);
    }
  };

  // Import to session
  const handleImportToSession = (song: LibrarySong) => {
    onImportSong({ title: song.title, lyrics: song.lyrics });
  };

  // Open edit dialog - convert LibrarySong to Song format for editor
  const handleEditSong = (song: LibrarySong) => {
    setEditingLibrarySong(song);
    // Convert to Song format for the editor
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

  // Handle save from editor (update only - new songs come from Session)
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

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Song Library
          </h2>
          <Badge variant="secondary" className="text-[10px]">
            {songs.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs..."
            className="h-8 pl-8 text-xs bg-muted/30"
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
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No songs found' : 'Library is empty'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {searchQuery
                ? 'Try a different search'
                : 'Songs added in Session are saved here'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                className={cn(
                  'group p-3 rounded-lg border transition-all duration-150 cursor-pointer',
                  selectedSong?.id === song.id
                    ? 'bg-muted border-foreground/20'
                    : 'bg-transparent border-transparent hover:bg-muted/50 hover:border-border',
                )}
                onClick={() => setSelectedSong(song)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Music className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate">
                        {song.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {song.lyrics.split('\n')[0]}
                    </p>
                    {(song.categories.length > 0 || song.tags.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImportToSession(song);
                      }}
                      title="Import to session"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSong(song);
                      }}
                      title="Edit"
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
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Selected Song Preview */}
      {selectedSong && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {selectedSong.title}
            </h3>
            <Button
              size="sm"
              onClick={() => handleImportToSession(selectedSong)}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add to Session
            </Button>
          </div>
          <ScrollArea className="h-24">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
              {selectedSong.lyrics}
            </pre>
          </ScrollArea>
        </div>
      )}

      {/* Song Editor Dialog */}
      <SongEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        song={editingSong}
        onSave={handleEditorSave}
      />
    </div>
  );
}
