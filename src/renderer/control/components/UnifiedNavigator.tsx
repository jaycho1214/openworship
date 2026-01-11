import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Music2,
  Pencil,
  Trash2,
  ChevronRight,
  Link2,
  Search,
  X,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Input } from '../../components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { useSession, useSetlist, usePresentation } from '../context';
import { Song, Slide } from '../../shared/types/song';
import { cn } from '../../lib/utils';
import SongEditor from './SongEditor';

interface SlideItemProps {
  slide: Slide;
  slideIndex: number;
  isActive: boolean;
  sectionNumber: number | null;
  onClick: () => void;
}

function SlideItem({
  slide,
  slideIndex: _slideIndex,
  isActive,
  sectionNumber,
  onClick,
}: SlideItemProps) {
  return (
    <div>
      {/* Section header */}
      {slide.section && (
        <div className="flex items-center gap-2 px-1 py-1.5 mt-1.5 first:mt-0">
          <div className="h-px flex-1 bg-border/50" />
          <div className="flex items-center gap-1.5">
            {/* Only show keyboard shortcut for current song */}
            {sectionNumber !== null && (
              <kbd className="w-4 h-4 flex items-center justify-center text-[9px] font-mono font-bold bg-foreground text-background rounded">
                {sectionNumber}
              </kbd>
            )}
            {slide.sectionRef ? (
              <div className="flex items-center gap-1">
                <Link2 className="w-2.5 h-2.5 text-blue-500" />
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                  {slide.sectionRef}
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {slide.section}
              </span>
            )}
          </div>
          <div className="h-px flex-1 bg-border/50" />
        </div>
      )}

      {/* Slide content - simplified */}
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left py-1.5 px-2 rounded transition-all duration-100',
          isActive ? 'bg-active' : 'hover:bg-muted/50',
        )}
      >
        {slide.lines.map((line, lineIndex) => (
          <p
            key={lineIndex}
            className={cn(
              'text-xs leading-relaxed truncate',
              isActive
                ? 'text-active-foreground font-medium'
                : 'text-foreground',
              lineIndex > 0 && 'opacity-60',
            )}
          >
            {line || '\u00A0'}
          </p>
        ))}
      </button>
    </div>
  );
}

interface SortableSongGroupProps {
  song: Song;
  songIndex: number;
  isCurrentSong: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentSlideIndex: number;
  sectionIndices: number[];
  onSelectSlide: (slideIndex: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}

function SortableSongGroup({
  song,
  songIndex,
  isCurrentSong,
  isOpen,
  onOpenChange,
  currentSlideIndex,
  sectionIndices,
  onSelectSlide,
  onEdit,
  onDelete,
  t,
}: SortableSongGroupProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get section number for a slide
  const getSectionNumber = (slideIndex: number): number | null => {
    const sectionIdx = sectionIndices.indexOf(slideIndex);
    if (sectionIdx !== -1 && sectionIdx < 9) {
      return sectionIdx + 1;
    }
    return null;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn('mb-1 transition-all', isDragging && 'opacity-50')}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                'group flex items-center gap-1 rounded-md transition-all',
                isCurrentSong ? 'bg-active' : 'hover:bg-muted/50',
              )}
            >
              {/* Drag handle */}
              <button
                className="touch-none p-1.5 opacity-30 hover:opacity-100 transition-all cursor-grab active:cursor-grabbing"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {/* Song number */}
              <span
                className={cn(
                  'text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded shrink-0',
                  isCurrentSong
                    ? 'text-active-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {songIndex + 1}
              </span>

              {/* Collapsible trigger - only toggles open/close */}
              <CollapsibleTrigger className="flex-1 flex items-center gap-2 py-2 pr-2 min-w-0">
                <p
                  className={cn(
                    'text-sm truncate flex-1 text-left',
                    isCurrentSong
                      ? 'text-active-foreground font-semibold'
                      : 'text-foreground font-medium',
                  )}
                >
                  {song.title}
                </p>
                <span
                  className={cn(
                    'text-[10px] shrink-0',
                    isCurrentSong
                      ? 'text-active-foreground/60'
                      : 'text-muted-foreground',
                  )}
                >
                  {song.slides.length}
                </span>
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
                    isCurrentSong
                      ? 'text-active-foreground/60'
                      : 'text-muted-foreground',
                    isOpen && 'rotate-90',
                  )}
                />
              </CollapsibleTrigger>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="w-4 h-4" />
              {t('editSong')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onDelete}
              className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
              {t('deleteSong')}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <CollapsibleContent>
          <div className="pl-4 pr-1 pb-2 pt-1 space-y-0.5">
            {song.slides.map((slide, slideIndex) => (
              <SlideItem
                key={slide.id}
                slide={slide}
                slideIndex={slideIndex}
                isActive={isCurrentSong && slideIndex === currentSlideIndex}
                sectionNumber={getSectionNumber(slideIndex)}
                onClick={() => onSelectSlide(slideIndex)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface UnifiedNavigatorProps {
  onBack?: () => void;
}

export default function UnifiedNavigator({ onBack }: UnifiedNavigatorProps) {
  const { t } = useTranslation();
  const { currentSessionId } = useSession();
  const { currentSetlist, addSong, deleteSong, reorderSongs } = useSetlist();
  const { currentSong, presentationState, goToPosition, getSectionIndices } =
    usePresentation();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openSongIds, setOpenSongIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-open current song (add to open set, don't replace)
  useEffect(() => {
    if (currentSong) {
      setOpenSongIds((prev) => {
        if (prev.has(currentSong.id)) return prev;
        return new Set([...prev, currentSong.id]);
      });
    }
  }, [currentSong?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const songs = currentSetlist?.songs ?? [];

  // Get the current song's section indices
  const sectionIndices = currentSong ? getSectionIndices() : [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = songs.findIndex((s) => s.id === active.id);
      const newIndex = songs.findIndex((s) => s.id === over.id);
      reorderSongs(oldIndex, newIndex);
    }
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setIsEditorOpen(true);
  };

  // Drop handlers for library songs
  const handleDragOver = (e: React.DragEvent) => {
    if (!currentSessionId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!currentSessionId) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'library-song' && data.song) {
        addSong(data.song.title, data.song.lyrics);
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  };

  // Filter songs based on search
  const filteredSongs = songs.filter((song) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(query) ||
      song.slides.some((slide) =>
        slide.lines.some((line) => line.toLowerCase().includes(query)),
      )
    );
  });

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-card/50 transition-colors',
        isDragOver && 'bg-accent/20 ring-2 ring-accent ring-inset',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header - standardized h-12 */}
      <div className="h-12 px-4 border-b border-border flex items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -ml-1"
              onClick={onBack}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t('songList')}
          </h2>
        </div>
      </div>

      {/* Search input */}
      {currentSessionId && songs.length > 0 && (
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`${t('searchSongs')} (⌘F)`}
              className="h-8 pl-8 pr-8 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2">
          {!currentSessionId ? (
            /* No session selected */
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Music2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center font-medium">
                {t('selectSession')}
              </p>
            </div>
          ) : songs.length === 0 ? (
            /* Session selected but no songs */
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Music2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center font-medium">
                {t('noSongs')}
              </p>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {t('dragToAdd')}
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredSongs.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  {filteredSongs.map((song) => {
                    const originalIndex = songs.findIndex(
                      (s) => s.id === song.id,
                    );
                    const isCurrentSong =
                      originalIndex === presentationState.currentSongIndex;

                    return (
                      <SortableSongGroup
                        key={song.id}
                        song={song}
                        songIndex={originalIndex}
                        isCurrentSong={isCurrentSong}
                        isOpen={openSongIds.has(song.id)}
                        onOpenChange={(open) =>
                          setOpenSongIds((prev) => {
                            const next = new Set(prev);
                            if (open) {
                              next.add(song.id);
                            } else {
                              next.delete(song.id);
                            }
                            return next;
                          })
                        }
                        currentSlideIndex={presentationState.currentSlideIndex}
                        sectionIndices={isCurrentSong ? sectionIndices : []}
                        onSelectSlide={(slideIndex) =>
                          goToPosition(originalIndex, slideIndex)
                        }
                        onEdit={() => handleEditSong(song)}
                        onDelete={() => deleteSong(song.id)}
                        t={t}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </ScrollArea>

      <SongEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        song={editingSong}
      />
    </div>
  );
}
