/* eslint-disable no-console */
import { useState, useRef, useEffect, memo } from 'react';
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
  BookOpen,
  StickyNote,
  Plus,
  Copy,
  ChevronsDownUp,
  ChevronsUpDown,
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
import {
  useSession,
  useSetlist,
  usePresentation,
  useProjection,
} from '../context';
import { Song, Slide, SlideOverrides } from '../../shared/types/song';
import {
  SetlistItem,
  AnnouncementSetlistItem,
  isSongItem,
  isBibleItem,
  isAnnouncementItem,
} from '../../../shared/types/setlistItem';
import {
  getItemSlides,
  getItemTitle,
} from '../../shared/utils/setlistItemUtils';
import { cn } from '../../lib/utils';
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
import SongEditor from './SongEditor';
import { AddContentDialog } from './AddContentDialog';
import SlideSettingsDialog from './SlideSettingsDialog';
import NoteSettingsDialog from './NoteSettingsDialog';

// Constants for item type icons - hoisted to module scope to prevent recreation
const ITEM_TYPE_ICONS = {
  song: { icon: Music2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  bible: { icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  announcement: {
    icon: StickyNote,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  default: { icon: Music2, color: 'text-muted-foreground', bg: 'bg-muted' },
} as const;

// Get icon and color for item type - pure function hoisted to module scope
function getItemTypeIcon(item: SetlistItem) {
  if (isSongItem(item)) return ITEM_TYPE_ICONS.song;
  if (isBibleItem(item)) return ITEM_TYPE_ICONS.bible;
  if (isAnnouncementItem(item)) return ITEM_TYPE_ICONS.announcement;
  return ITEM_TYPE_ICONS.default;
}

interface SlideItemProps {
  slide: Slide;
  slideIndex: number;
  isActive: boolean;
  sectionNumber: number | null;
  hasSections: boolean;
  onClick: () => void;
  onOpenSettings: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
  t: (key: string) => string;
}

const SlideItem = memo(function SlideItem({
  slide,
  slideIndex: _slideIndex,
  isActive,
  sectionNumber,
  hasSections,
  onClick,
  onOpenSettings,
  onDuplicate,
  onDelete,
  canDelete,
  t,
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
      {/* Shortcut-only indicator when no sections are defined in the song */}
      {!slide.section && !hasSections && sectionNumber !== null && (
        <div className="flex items-center gap-1.5 px-1 py-0.5 mt-1.5 first:mt-0">
          <kbd className="w-4 h-4 flex items-center justify-center text-[9px] font-mono font-bold bg-muted text-muted-foreground rounded">
            {sectionNumber}
          </kbd>
        </div>
      )}

      {/* Slide content with context menu */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={onClick}
            onDoubleClick={onOpenSettings}
            className={cn(
              'w-full text-left py-1.5 px-2 rounded transition-all duration-100',
              isActive ? 'bg-active' : 'hover:bg-muted/50',
            )}
          >
            {slide.lines.map((line, lineIndex) => (
              <p
                key={lineIndex} // eslint-disable-line react/no-array-index-key -- lines have no stable ID
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
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={onOpenSettings} className="gap-2">
            <Pencil className="w-4 h-4" />
            {t('slideSettings')}
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
            {t('deleteSlide')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
});

interface SortableItemGroupProps {
  item: SetlistItem;
  itemIndex: number;
  isCurrentItem: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentSlideIndex: number;
  sectionIndices: number[];
  defaultFontSize: number;
  isOverlay?: boolean;
  isOverlayActive?: boolean;
  onSelectSlide: (slideIndex: number) => void;
  onToggleOverlay?: () => void;
  onEdit?: () => void;
  onEditNote?: (updates: {
    title: string;
    content: string;
    displayMode: 'slide' | 'overlay';
    contentType: 'text' | 'image';
    imagePath?: string;
    overlayPosition: 'top' | 'bottom';
  }) => void;
  onDelete: () => void;
  onSaveSlide: (
    slideIndex: number,
    lines: string[],
    section?: string,
    overrides?: SlideOverrides,
    lineRoles?: ('body' | 'reference')[],
  ) => void;
  onDuplicateSlide: (slideIndex: number) => void;
  onDeleteSlide: (slideIndex: number) => void;
  t: (key: string) => string;
}

const SortableItemGroup = memo(function SortableItemGroup({
  item,
  itemIndex,
  isCurrentItem,
  isOpen,
  onOpenChange,
  currentSlideIndex,
  sectionIndices,
  defaultFontSize,
  isOverlay,
  isOverlayActive,
  onSelectSlide,
  onToggleOverlay,
  onEdit,
  onEditNote,
  onDelete,
  onSaveSlide,
  onDuplicateSlide,
  onDeleteSlide,
  t,
}: SortableItemGroupProps) {
  const [settingsSlide, setSettingsSlide] = useState<{
    slide: Slide;
    index: number;
  } | null>(null);
  const [isNoteSettingsOpen, setIsNoteSettingsOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const slides = getItemSlides(item);
  const { icon: Icon, color, bg } = getItemTypeIcon(item);
  const title = getItemTitle(item, t);
  const isNote = isAnnouncementItem(item);

  // Check if the item has any sections defined
  const hasSections = slides.some((slide) => slide.section);

  // Get section number for a slide
  const getSectionNumber = (slideIndex: number): number | null => {
    const sectionIdx = sectionIndices.indexOf(slideIndex);
    if (sectionIdx !== -1 && sectionIdx < 9) {
      return sectionIdx + 1;
    }
    return null;
  };

  // Header row shared by all item types
  const headerRow = (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'group flex items-center gap-1 rounded-md transition-all',
            isOverlay && isOverlayActive
              ? 'bg-amber-500/15'
              : isCurrentItem
                ? 'bg-active'
                : 'hover:bg-muted/50',
          )}
        >
          {/* Drag handle */}
          <button
            className="touch-none p-1.5 opacity-50 hover:opacity-100 transition-all cursor-grab active:cursor-grabbing flex-shrink-0"
            {...attributes}
            {...listeners}
            aria-label={t('dragToReorder')}
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {/* Item number */}
          <span
            className={cn(
              'text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded shrink-0',
              isCurrentItem
                ? 'text-active-foreground'
                : 'text-muted-foreground',
            )}
          >
            {itemIndex + 1}
          </span>

          {/* Type icon */}
          <div
            className={cn(
              'w-5 h-5 rounded flex items-center justify-center shrink-0',
              isCurrentItem ? 'bg-active-foreground/10' : bg,
            )}
          >
            <Icon
              className={cn(
                'w-3 h-3',
                isCurrentItem ? 'text-active-foreground' : color,
              )}
            />
          </div>

          {/* Title area — varies by type */}
          {isOverlay ? (
            // Overlay notes: click to toggle banner
            <button
              className="flex-1 flex items-center gap-2 py-2 pr-2 min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleOverlay?.();
              }}
            >
              <p
                className={cn(
                  'text-sm truncate flex-1 text-left',
                  isOverlayActive
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-foreground font-medium',
                )}
              >
                {title}
              </p>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                {isOverlayActive ? t('live') : t('noteDisplayOverlay')}
              </span>
            </button>
          ) : isNote ? (
            // Slide-mode notes: no collapsible, just a title (slides shown inline below)
            <div className="flex-1 flex items-center gap-2 py-2 pr-2 min-w-0">
              <p
                className={cn(
                  'text-sm truncate flex-1 text-left',
                  isCurrentItem
                    ? 'text-active-foreground font-semibold'
                    : 'text-foreground font-medium',
                )}
              >
                {title}
              </p>
            </div>
          ) : (
            // Songs / Bible: collapsible with slide count + chevron
            <CollapsibleTrigger className="flex-1 flex items-center gap-2 py-2 pr-2 min-w-0">
              <p
                className={cn(
                  'text-sm truncate flex-1 text-left',
                  isCurrentItem
                    ? 'text-active-foreground font-semibold'
                    : 'text-foreground font-medium',
                )}
              >
                {title}
              </p>
              <span
                className={cn(
                  'text-[10px] shrink-0',
                  isCurrentItem
                    ? 'text-active-foreground/60'
                    : 'text-muted-foreground',
                )}
              >
                {slides.length}
              </span>
              <ChevronRight
                className={cn(
                  'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
                  isCurrentItem
                    ? 'text-active-foreground/60'
                    : 'text-muted-foreground',
                  isOpen && 'rotate-90',
                )}
              />
            </CollapsibleTrigger>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {onEdit && isSongItem(item) && (
          <>
            <ContextMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="w-4 h-4" />
              {t('editSong')}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {isNote && (
          <>
            <ContextMenuItem
              onClick={() => setIsNoteSettingsOpen(true)}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              {t('slideSettings')}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          onClick={onDelete}
          className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/20"
        >
          <Trash2 className="w-4 h-4" />
          {t('delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  // Slides list (shared between collapsible content and always-visible note slides)
  const slidesList = (
    <div className="pl-4 pr-1 pb-2 pt-1 space-y-0.5">
      {slides.map((slide, slideIndex) => (
        <SlideItem
          key={slide.id}
          slide={slide}
          slideIndex={slideIndex}
          isActive={isCurrentItem && slideIndex === currentSlideIndex}
          sectionNumber={getSectionNumber(slideIndex)}
          hasSections={hasSections}
          onClick={() => onSelectSlide(slideIndex)}
          onOpenSettings={() => setSettingsSlide({ slide, index: slideIndex })}
          onDuplicate={() => onDuplicateSlide(slideIndex)}
          onDelete={() => onDeleteSlide(slideIndex)}
          canDelete={slides.length > 1}
          t={t}
        />
      ))}
    </div>
  );

  // Notes are never collapsible — overlay notes show no slides, slide notes show them inline
  if (isNote) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn('mb-1 transition-all', isDragging && 'opacity-50')}
      >
        {headerRow}
        {/* Slide-mode notes: always show slides. Overlay notes: no slides. */}
        {!isOverlay && slidesList}

        <SlideSettingsDialog
          open={settingsSlide !== null}
          onOpenChange={(open) => {
            if (!open) setSettingsSlide(null);
          }}
          slide={settingsSlide?.slide ?? null}
          defaultFontSize={defaultFontSize}
          onSave={(lines, section, overrides, lineRoles) => {
            if (settingsSlide !== null) {
              onSaveSlide(
                settingsSlide.index,
                lines,
                section,
                overrides,
                lineRoles,
              );
            }
          }}
        />

        {isAnnouncementItem(item) && (
          <NoteSettingsDialog
            open={isNoteSettingsOpen}
            onOpenChange={setIsNoteSettingsOpen}
            item={item}
            onSave={(updates) => onEditNote?.(updates)}
          />
        )}
      </div>
    );
  }

  // Songs / Bible: use Collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn('mb-1 transition-all', isDragging && 'opacity-50')}
      >
        {headerRow}
        <CollapsibleContent>{slidesList}</CollapsibleContent>
      </div>

      {/* Slide Settings Dialog */}
      <SlideSettingsDialog
        open={settingsSlide !== null}
        onOpenChange={(open) => {
          if (!open) setSettingsSlide(null);
        }}
        slide={settingsSlide?.slide ?? null}
        defaultFontSize={defaultFontSize}
        onSave={(lines, section, overrides, lineRoles) => {
          if (settingsSlide !== null) {
            onSaveSlide(
              settingsSlide.index,
              lines,
              section,
              overrides,
              lineRoles,
            );
          }
        }}
      />
    </Collapsible>
  );
});

interface UnifiedNavigatorProps {
  onBack?: () => void;
}

export default function UnifiedNavigator({ onBack }: UnifiedNavigatorProps) {
  const { t } = useTranslation();
  const { currentSessionId } = useSession();
  const {
    currentSetlist,
    reorderItems,
    deleteItem,
    addItem,
    updateItem,
    duplicateSlide,
    deleteSlide,
    updateSlide,
  } = useSetlist();
  const {
    currentItem,
    currentItemIndex,
    presentationState,
    goToItem,
    getSectionIndices,
  } = usePresentation();
  const {
    projectionSettings,
    overlayNote,
    isOverlayNoteVisible,
    toggleOverlayNote,
  } = useProjection();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(new Set());
  const [isAddContentOpen, setIsAddContentOpen] = useState(false);
  const [addContentDefaultTab, setAddContentDefaultTab] = useState<
    'song' | 'bible' | 'announcement'
  >('song');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const items = currentSetlist?.items ?? [];

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

  // Get the current item's section indices
  const sectionIndices = currentItem ? getSectionIndices() : [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    reorderItems(oldIndex, newIndex);
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
      if (data.type === 'library-song' && data.song?.id) {
        // Use addItem directly since the song is already in the library
        addItem({ type: 'song', songId: data.song.id });
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  };

  // Filter items based on search
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = getItemTitle(item, t).toLowerCase();
    if (title.includes(query)) return true;

    // Also search in slides content
    const slides = getItemSlides(item);
    return slides.some((slide) =>
      slide.lines.some((line) => line.toLowerCase().includes(query)),
    );
  });

  // Keyboard shortcuts for search and quick add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Cmd/Ctrl+F for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Quick add shortcuts (only when session is active)
      if (!currentSessionId) return;

      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          setAddContentDefaultTab('song');
          setIsAddContentOpen(true);
          break;
        case 'i':
          e.preventDefault();
          setAddContentDefaultTab('bible');
          setIsAddContentOpen(true);
          break;
        case 'a':
          e.preventDefault();
          setAddContentDefaultTab('announcement');
          setIsAddContentOpen(true);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSessionId]);

  // Current item index comes directly from presentation context now

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
      <div className="h-12 px-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -ml-1"
              onClick={onBack}
              aria-label={t('goBack')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t('setlist')}
          </h2>
        </div>
        {currentSessionId && (
          <div className="flex items-center gap-0.5">
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const allOpen = items.every((item) =>
                    openItemIds.has(item.id),
                  );
                  if (allOpen) {
                    setOpenItemIds(new Set());
                  } else {
                    setOpenItemIds(new Set(items.map((item) => item.id)));
                  }
                }}
                title={
                  items.every((item) => openItemIds.has(item.id))
                    ? t('collapseAll')
                    : t('expandAll')
                }
                aria-label={
                  items.every((item) => openItemIds.has(item.id))
                    ? t('collapseAll')
                    : t('expandAll')
                }
              >
                {items.every((item) => openItemIds.has(item.id)) ? (
                  <ChevronsDownUp className="w-4 h-4" />
                ) : (
                  <ChevronsUpDown className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsAddContentOpen(true)}
              aria-label={t('addContent')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Search input */}
      {currentSessionId && items.length > 0 && (
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
          ) : items.length === 0 ? (
            /* Session selected but no items */
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
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setIsAddContentOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('addContent')}
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  {filteredItems.map((item) => {
                    const originalIndex = items.findIndex(
                      (i) => i.id === item.id,
                    );
                    const isCurrentItem = originalIndex === currentItemIndex;

                    // Get song for editing if it's a song item
                    // eslint-disable-next-line no-underscore-dangle
                    const song = isSongItem(item) ? item._song : undefined;

                    const isOverlayNote =
                      isAnnouncementItem(item) &&
                      item.displayMode === 'overlay';
                    const isOverlayActive =
                      isOverlayNote &&
                      isOverlayNoteVisible &&
                      overlayNote?.id === item.id;

                    return (
                      <SortableItemGroup
                        key={item.id}
                        item={item}
                        itemIndex={originalIndex}
                        isCurrentItem={isCurrentItem}
                        isOpen={openItemIds.has(item.id)}
                        onOpenChange={(open) =>
                          setOpenItemIds((prev) => {
                            const next = new Set(prev);
                            if (open) {
                              next.add(item.id);
                            } else {
                              next.delete(item.id);
                            }
                            return next;
                          })
                        }
                        currentSlideIndex={presentationState.currentSlideIndex}
                        sectionIndices={isCurrentItem ? sectionIndices : []}
                        defaultFontSize={projectionSettings.fontSize}
                        isOverlay={isOverlayNote}
                        isOverlayActive={isOverlayActive}
                        onSelectSlide={(slideIndex) => {
                          goToItem(originalIndex, slideIndex);
                        }}
                        onToggleOverlay={
                          isOverlayNote && isAnnouncementItem(item)
                            ? () =>
                                toggleOverlayNote(
                                  item as AnnouncementSetlistItem,
                                )
                            : undefined
                        }
                        onEdit={song ? () => handleEditSong(song) : undefined}
                        onEditNote={
                          isAnnouncementItem(item)
                            ? async (updates) => {
                                const electron = (window as any).electron;
                                if (!electron?.sessionItem?.update) return;
                                const result =
                                  await electron.sessionItem.update(item.id, {
                                    title: updates.title,
                                    content: updates.content,
                                    noteDisplayMode: updates.displayMode,
                                    noteContentType: updates.contentType,
                                    imagePath: updates.imagePath,
                                    overlayPosition: updates.overlayPosition,
                                  });
                                if (result.success && result.data) {
                                  updateItem(item.id, result.data);
                                }
                              }
                            : undefined
                        }
                        onDelete={() => setItemToDelete(item.id)}
                        onSaveSlide={(
                          slideIndex,
                          lines,
                          section,
                          overrides,
                          lineRoles,
                        ) =>
                          updateSlide(
                            originalIndex,
                            slideIndex,
                            lines,
                            section,
                            overrides,
                            lineRoles,
                          )
                        }
                        onDuplicateSlide={(slideIndex) =>
                          duplicateSlide(originalIndex, slideIndex)
                        }
                        onDeleteSlide={(slideIndex) =>
                          deleteSlide(originalIndex, slideIndex)
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

      <AddContentDialog
        open={isAddContentOpen}
        onOpenChange={setIsAddContentOpen}
        onAddItem={addItem}
        defaultTab={addContentDefaultTab}
      />

      {/* Delete Item Confirmation Dialog */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteSongDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  deleteItem(itemToDelete);
                  setItemToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
