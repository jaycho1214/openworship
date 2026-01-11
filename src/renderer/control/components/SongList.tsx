import { useState } from 'react';
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
  Plus,
  GripVertical,
  Music2,
  Pencil,
  Trash2,
  Play,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { useSession, useSetlist, usePresentation } from '../context';
import { Song } from '../../shared/types/song';
import { cn } from '../../lib/utils';
import SongEditor from './SongEditor';

interface SectionInfo {
  name: string;
  slideIndex: number;
}

interface SortableSongItemProps {
  song: Song;
  index: number;
  isActive: boolean;
  sections: SectionInfo[];
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPlayFromBeginning: () => void;
  onPlayFromSection: (slideIndex: number) => void;
  t: (key: string) => string;
}

function SortableSongItem({
  song,
  index,
  isActive,
  sections,
  onSelect,
  onEdit,
  onDelete,
  onPlayFromBeginning,
  onPlayFromSection,
  t,
}: SortableSongItemProps) {
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            'group relative flex items-center gap-2 pl-2 pr-3 py-3 rounded-lg cursor-pointer',
            'transition-all duration-150',
            isDragging && 'opacity-50',
            isActive
              ? 'bg-active border-2 border-active-border-subtle shadow-elevated'
              : 'hover:bg-muted border-2 border-transparent hover:border-border',
          )}
          onClick={onSelect}
        >
          {/* Number - absolute top right */}
          <span
            className={cn(
              'absolute top-1.5 right-2.5 text-[10px] font-bold',
              isActive ? 'text-active-foreground' : 'text-muted-foreground',
            )}
          >
            {index + 1}
          </span>

          {/* Drag handle - left */}
          <button
            className="touch-none p-1 rounded opacity-40 hover:opacity-100 hover:bg-accent transition-all cursor-grab active:cursor-grabbing flex-shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <p
              className={cn(
                'text-sm truncate',
                isActive
                  ? 'text-active-foreground font-bold'
                  : 'text-foreground font-semibold',
              )}
            >
              {song.title}
            </p>
            <p
              className={cn(
                'text-xs font-medium mt-0.5',
                isActive
                  ? 'text-active-foreground-secondary'
                  : 'text-muted-foreground',
              )}
            >
              {song.slides.length} {t('slides')}
            </p>
          </div>

          {/* Action buttons - fixed width, no shrinking */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label={t('editSong')}
              title={t('editSong')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-300 hover:bg-red-500/20"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label={t('deleteSong')}
              title={t('deleteSong')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onPlayFromBeginning} className="gap-2">
          <Play className="w-4 h-4" />
          {t('playFromBeginning')}
        </ContextMenuItem>
        {sections.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2">
              <ChevronRight className="w-4 h-4" />
              {t('playFromSection')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {sections.map((section, idx) => (
                <ContextMenuItem
                  key={`${section.name}-${section.slideIndex}`}
                  onClick={() => onPlayFromSection(section.slideIndex)}
                >
                  <span className="w-5 text-center text-muted-foreground text-xs">
                    {idx + 1}
                  </span>
                  <span className="ml-1">{section.name}</span>
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onEdit} className="gap-2">
          <Pencil className="w-4 h-4" />
          {t('editSong')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDelete}
          className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/20"
        >
          <Trash2 className="w-4 h-4" />
          {t('deleteSong')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Helper to extract sections from a song
function getSectionsFromSong(song: Song): SectionInfo[] {
  const sections: SectionInfo[] = [];
  song.slides.forEach((slide, index) => {
    if (slide.section) {
      sections.push({
        name: slide.section,
        slideIndex: index,
      });
    }
  });
  return sections;
}

export default function SongList() {
  const { t } = useTranslation();
  const { currentSessionId } = useSession();
  const { currentSetlist, deleteSong, reorderSongs, addSong } = useSetlist();
  const { presentationState, goToSong, goToPosition } = usePresentation();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = songs.findIndex((s) => s.id === active.id);
      const newIndex = songs.findIndex((s) => s.id === over.id);
      reorderSongs(oldIndex, newIndex);
    }
  };

  const handleAddSong = () => {
    setEditingSong(null);
    setIsEditorOpen(true);
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
    // Only set to false if we're leaving the container, not entering a child
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
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t('songList')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-semibold text-foreground hover:text-foreground hover:bg-muted border-border"
            onClick={handleAddSong}
            disabled={!currentSessionId}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('addSong')}
          </Button>
        </div>
      </div>

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
              <p className="text-sm text-muted-foreground text-center mb-4 font-medium">
                {t('noSongs')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-medium border-border bg-muted text-foreground hover:text-white hover:bg-accent"
                onClick={handleAddSong}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t('addFirstSong')}
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={songs.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {songs.map((song, index) => {
                    const sections = getSectionsFromSong(song);
                    return (
                      <SortableSongItem
                        key={song.id}
                        song={song}
                        index={index}
                        isActive={index === presentationState.currentSongIndex}
                        sections={sections}
                        onSelect={() => goToSong(index)}
                        onEdit={() => handleEditSong(song)}
                        onDelete={() => deleteSong(song.id)}
                        onPlayFromBeginning={() => goToPosition(index, 0)}
                        onPlayFromSection={(slideIndex) =>
                          goToPosition(index, slideIndex)
                        }
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
