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
  Copy,
  Trash2,
  GripVertical,
  Pencil,
  Search,
  X,
  Link2,
} from 'lucide-react';
import { usePresentation, useSetlist } from '../context';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Input } from '../../components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { Slide } from '../../shared/types/song';
import SectionTimeline from './SectionTimeline';

interface SortableSlideProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  isEditing: boolean;
  isHighlighted: boolean;
  sectionNumber: number | null; // 1-9 for keyboard shortcut, null if not a section start
  onClick: () => void;
  onDoubleClick: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: (lines: string[], section?: string) => void;
  onCancelEdit: () => void;
  canDelete: boolean;
  slideRef?: React.RefObject<HTMLDivElement | null>;
}

function SortableSlide({
  slide,
  index: _index,
  isActive,
  isEditing,
  isHighlighted,
  sectionNumber,
  onClick,
  onDoubleClick,
  onEdit,
  onDuplicate,
  onDelete,
  onSave,
  onCancelEdit,
  canDelete,
  slideRef,
}: SortableSlideProps) {
  const { t } = useTranslation();
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Initialize edit text when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditText(slide.lines.join('\n'));
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 0);
    }
  }, [isEditing, slide.lines]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const handleSave = () => {
    const lines = editText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
    if (lines.length > 0) {
      onSave(lines, slide.section);
    }
    onCancelEdit();
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (isEditing) {
        handleSave();
      }
    }, 100);
  };

  return (
    <div ref={slideRef}>
      {/* Section header with keyboard shortcut */}
      {slide.section && sectionNumber !== null && (
        <div className="flex items-center gap-2 px-1 py-2.5 mt-4 first:mt-0">
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-2">
            <kbd className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold bg-foreground text-background rounded">
              {sectionNumber}
            </kbd>
            {slide.sectionRef ? (
              <div className="flex items-center gap-1.5">
                <Link2 className="w-3 h-3 text-blue-500" />
                <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">
                  {slide.sectionRef}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                {slide.section}
              </span>
            )}
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={isEditing}>
          <div
            ref={setNodeRef}
            style={style}
            onDoubleClick={isEditing ? undefined : onDoubleClick}
            className={cn(
              'w-full relative rounded-lg p-3.5 text-left transition-all duration-150',
              'border-2 mr-1 group',
              isDragging && 'opacity-50 z-50',
              isEditing && 'ring-2 ring-ring',
              isHighlighted && !isActive && 'ring-2 ring-blue-500/50',
              slide.sectionRef &&
                !isActive &&
                'border-blue-500/20 bg-blue-500/5',
              isActive
                ? 'bg-active border-active-border-subtle shadow-elevated'
                : !slide.sectionRef &&
                    'bg-muted/50 border-transparent hover:bg-muted hover:border-border',
            )}
          >
            {/* Reference indicator */}
            {slide.sectionRef && !isEditing && (
              <div className="absolute right-2 top-2">
                <Link2 className="w-3 h-3 text-blue-500/60" />
              </div>
            )}

            {/* Drag handle - hidden when editing */}
            {!isEditing && (
              <div
                {...attributes}
                {...listeners}
                className={cn(
                  'absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded cursor-grab',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'hover:bg-muted',
                  isActive ? 'text-active-foreground' : 'text-muted-foreground',
                )}
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}

            {isEditing ? (
              /* Edit mode - inline textarea */
              <div className="pl-2 pr-2">
                <textarea
                  ref={textareaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  className={cn(
                    'w-full bg-transparent border-none outline-none resize-none',
                    'text-sm leading-relaxed min-h-[48px]',
                    isActive
                      ? 'text-active-foreground font-medium'
                      : 'text-foreground',
                    'placeholder:text-muted-foreground',
                  )}
                  placeholder={t('enterLyrics')}
                  rows={Math.max(2, editText.split('\n').length)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('slideEditHint')}
                </p>
              </div>
            ) : (
              /* View mode - clickable area */
              <button onClick={onClick} className="w-full text-left pl-5">
                {/* Lyrics preview */}
                <div className="pr-2 min-h-[40px]">
                  {slide.lines.map((line, lineIndex) => (
                    <p
                      key={lineIndex}
                      className={cn(
                        'text-sm leading-relaxed',
                        isActive
                          ? 'text-active-foreground font-semibold'
                          : 'text-foreground',
                        lineIndex > 0 && 'mt-0.5 opacity-80',
                      )}
                    >
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              </button>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={onEdit} className="gap-2">
            <Pencil className="w-4 h-4" />
            {t('slideEdit')}
          </ContextMenuItem>
          <ContextMenuItem onClick={onDuplicate} className="gap-2">
            <Copy className="w-4 h-4" />
            {t('duplicateSlide')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={onDelete}
            disabled={!canDelete}
            className={cn(
              'gap-2',
              canDelete &&
                'text-red-400 focus:text-red-300 focus:bg-red-500/20',
            )}
          >
            <Trash2 className="w-4 h-4" />
            {t('deleteSong')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

export default function SlideNavigator() {
  const { t } = useTranslation();
  const { currentSong, presentationState, goToSlide, getSectionIndices } =
    usePresentation();
  const { reorderSlides, duplicateSlide, deleteSlide, updateSlide } =
    useSetlist();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeSlideRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active slide when navigating
  useEffect(() => {
    if (activeSlideRef.current) {
      activeSlideRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [presentationState.currentSlideIndex]);

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

  const { currentSongIndex } = presentationState;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && currentSong) {
      const oldIndex = currentSong.slides.findIndex((s) => s.id === active.id);
      const newIndex = currentSong.slides.findIndex((s) => s.id === over.id);
      reorderSlides(currentSongIndex, oldIndex, newIndex);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveSlide = (
    index: number,
    lines: string[],
    section?: string,
  ) => {
    updateSlide(currentSongIndex, index, lines, section);
    setEditingIndex(null);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
  };

  // Get section indices for keyboard shortcuts
  const sectionIndices = getSectionIndices();

  // Create a map of slide index -> section number (1-9)
  const getSectionNumber = (slideIndex: number): number | null => {
    const sectionIdx = sectionIndices.indexOf(slideIndex);
    if (sectionIdx !== -1 && sectionIdx < 9) {
      return sectionIdx + 1;
    }
    return null;
  };

  // Filter slides based on search query
  const getHighlightedSlides = (): Set<number> => {
    if (!searchQuery.trim() || !currentSong) return new Set();

    const query = searchQuery.toLowerCase();
    const highlighted = new Set<number>();

    currentSong.slides.forEach((slide, index) => {
      const text = slide.lines.join(' ').toLowerCase();
      if (text.includes(query)) {
        highlighted.add(index);
      }
    });

    return highlighted;
  };

  const highlightedSlides = getHighlightedSlides();

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

  if (!currentSong || currentSong.slides.length === 0) {
    return (
      <div className="flex flex-col h-full bg-card/50">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t('quickJump')}
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground font-medium text-center">
            {t('selectSong')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card/50">
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t('quickJump')}
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            {presentationState.currentSlideIndex + 1} /{' '}
            {currentSong.slides.length}
          </span>
        </div>
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchLyrics')}
            className="h-8 pl-8 pr-8 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t('clearSearch')}
              title={t('clearSearch')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-[10px] text-muted-foreground">
            {t('slidesFoundCount', { count: highlightedSlides.size })}
          </p>
        )}
      </div>

      {/* Section Timeline */}
      <SectionTimeline />

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={currentSong.slides.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {currentSong.slides.map((slide, index) => {
                const isActive = index === presentationState.currentSlideIndex;
                const isHighlighted = highlightedSlides.has(index);
                const sectionNumber = getSectionNumber(index);
                return (
                  <SortableSlide
                    key={slide.id}
                    slide={slide}
                    index={index}
                    isActive={isActive}
                    isEditing={editingIndex === index}
                    isHighlighted={isHighlighted}
                    sectionNumber={sectionNumber}
                    onClick={() => goToSlide(index)}
                    onDoubleClick={() => startEditing(index)}
                    onEdit={() => startEditing(index)}
                    onDuplicate={() => duplicateSlide(currentSongIndex, index)}
                    onDelete={() => deleteSlide(currentSongIndex, index)}
                    onSave={(lines, section) =>
                      handleSaveSlide(index, lines, section)
                    }
                    onCancelEdit={cancelEditing}
                    canDelete={currentSong.slides.length > 1}
                    slideRef={isActive ? activeSlideRef : undefined}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>
    </div>
  );
}
