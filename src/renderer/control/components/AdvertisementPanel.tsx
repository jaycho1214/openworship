import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  Play,
  Square,
  Eye,
  EyeOff,
  ImageIcon,
  Type,
  Maximize,
  PanelBottom,
  GripVertical,
  Pencil,
  Radio,
  Sliders,
  LayoutList,
  Layers,
  Upload,
} from 'lucide-react';
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
import { basename } from '../../shared/utils/fileHelpers';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Switch } from '../../components/ui/switch';
import { Slider } from '../../components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
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
import { useAdvertisement } from '../context';
import {
  Advertisement,
  AdvertisementCreateInput,
  AdvertisementPosition,
} from '../../../shared/types/advertisement';
import PaddingControl from './PaddingControl';

// ============================================================================
// SORTABLE AD CARD
// ============================================================================

interface SortableAdCardProps {
  ad: Advertisement;
  isActive: boolean;
  onShow: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableAdCard({
  ad,
  isActive,
  onShow,
  onEdit,
  onDelete,
}: SortableAdCardProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ad.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isText = ad.type === 'text';
  const preview = isText
    ? ad.content.substring(0, 40) + (ad.content.length > 40 ? '…' : '')
    : basename(ad.content) || t('adTypeImage');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-stretch rounded-lg overflow-hidden transition-all duration-200',
        'border bg-card',
        isDragging && 'opacity-60 scale-[1.02] z-50 shadow-lg',
        isActive
          ? 'border-amber-500/30 ring-1 ring-amber-500/30'
          : 'border-border hover:border-border',
      )}
    >
      {/* Left accent bar - type indicator */}
      <div
        className={cn(
          'w-1 flex-shrink-0',
          isText ? 'bg-blue-500' : 'bg-amber-500',
        )}
      />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'flex items-center justify-center w-8 cursor-grab active:cursor-grabbing',
          'text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        )}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Content area */}
      <div className="flex-1 py-2.5 pr-2 min-w-0">
        <div className="flex items-start gap-2">
          {/* Type icon */}
          <div
            className={cn(
              'flex-shrink-0 w-7 h-7 rounded flex items-center justify-center',
              isText
                ? 'bg-blue-500/10 text-blue-500'
                : 'bg-amber-500/10 text-amber-500',
            )}
          >
            {isText ? (
              <Type className="w-3.5 h-3.5" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
          </div>

          {/* Text info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[13px] font-medium text-foreground truncate leading-tight">
              {preview}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                  ad.displayStyle === 'fullscreen'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {ad.displayStyle === 'fullscreen' ? (
                  <Maximize className="w-2.5 h-2.5" />
                ) : (
                  <PanelBottom className="w-2.5 h-2.5" />
                )}
                {ad.displayStyle === 'fullscreen'
                  ? t('adFullscreen')
                  : t('adBanner')}
              </span>
              {isActive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {t('live')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className={cn(
          'flex items-center gap-0.5 px-1.5',
          'opacity-0 group-hover:opacity-100 transition-opacity',
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onShow}
              className={cn(
                'w-7 h-7 rounded flex items-center justify-center transition-colors',
                'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10',
              )}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t('adShowNow')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                'w-7 h-7 rounded flex items-center justify-center transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t('edit')}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onDelete}
              className={cn(
                'w-7 h-7 rounded flex items-center justify-center transition-colors',
                'text-muted-foreground hover:text-red-500 hover:bg-red-500/20',
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t('delete')}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type TabType = 'ads' | 'settings';

export default function AdvertisementPanel() {
  const { t } = useTranslation();
  const {
    advertisements,
    isAdVisible,
    currentAd,
    showAdvertisement,
    hideAdvertisement,
    addAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
    reorderAdvertisements,
    displaySettings,
    updateDisplaySettings,
    isRotating,
    rotationInterval,
    setRotationInterval,
    startRotation,
    stopRotation,
    isLoading,
  } = useAdvertisement();

  const [activeTab, setActiveTab] = useState<TabType>('ads');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);

  // Form state
  const [adType, setAdType] = useState<'text' | 'image'>('text');
  const [adContent, setAdContent] = useState('');
  const [adDisplayStyle, setAdDisplayStyle] = useState<'fullscreen' | 'banner'>(
    'banner',
  );
  const [adTextColor, setAdTextColor] = useState('#ffffff');
  const [adFontSize, setAdFontSize] = useState(48);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = advertisements.findIndex((ad) => ad.id === active.id);
        const newIndex = advertisements.findIndex((ad) => ad.id === over.id);
        const newOrder = [...advertisements];
        const [removed] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, removed);
        reorderAdvertisements(newOrder.map((ad) => ad.id));
      }
    },
    [advertisements, reorderAdvertisements],
  );

  const resetForm = useCallback(() => {
    setAdType('text');
    setAdContent('');
    setAdDisplayStyle('banner');
    setAdTextColor('#ffffff');
    setAdFontSize(48);
    setEditingAd(null);
  }, []);

  const openAddDialog = useCallback(() => {
    resetForm();
    setIsAddDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((ad: Advertisement) => {
    setEditingAd(ad);
    setAdType(ad.type);
    setAdContent(ad.content);
    setAdDisplayStyle(ad.displayStyle);
    setAdTextColor(ad.textColor || '#ffffff');
    setAdFontSize(ad.fontSize || 48);
    setIsAddDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!adContent.trim()) return;

    const input: AdvertisementCreateInput = {
      type: adType,
      content: adContent,
      displayStyle: adDisplayStyle,
      textColor: adTextColor,
      fontSize: adFontSize,
    };

    if (editingAd) {
      await updateAdvertisement(editingAd.id, input);
    } else {
      await addAdvertisement(input);
    }

    setIsAddDialogOpen(false);
    resetForm();
  }, [
    adContent,
    adType,
    adDisplayStyle,
    adTextColor,
    adFontSize,
    editingAd,
    updateAdvertisement,
    addAdvertisement,
    resetForm,
  ]);

  const handleImageSelect = useCallback(async () => {
    const electron = (window as any).electron;
    if (!electron?.dialog) return;

    const result = await electron.dialog.openFile({
      title: t('selectImage'),
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
      ],
    });

    if (result && !result.canceled && result.filePaths?.length > 0) {
      setAdContent(result.filePaths[0]);
    }
  }, [t]);

  const positionOptions: { value: AdvertisementPosition; label: string }[] = [
    { value: 'top', label: t('adPositionTop') },
    { value: 'middle', label: t('adPositionMiddle') },
    { value: 'bottom', label: t('adPositionBottom') },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background">
        {/* ============================================================== */}
        {/* HEADER - Broadcast control style */}
        {/* ============================================================== */}
        <div className="flex-shrink-0 border-b border-border">
          {/* Top bar with title and primary actions */}
          <div className="flex items-center justify-between px-4 h-12">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold tracking-tight">
                {t('advertisements')}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Live indicator / Hide button */}
              {isAdVisible && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                      onClick={hideAdvertisement}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-semibold">{t('live')}</span>
                      <EyeOff className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('adHide')}</TooltipContent>
                </Tooltip>
              )}

              {/* Rotation toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isRotating ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-8 w-8',
                      isRotating && 'bg-primary text-primary-foreground',
                    )}
                    onClick={isRotating ? stopRotation : startRotation}
                    disabled={advertisements.length === 0}
                  >
                    {isRotating ? (
                      <Square className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isRotating ? t('adStopRotation') : t('adStartRotation')}
                </TooltipContent>
              </Tooltip>

              {/* Add button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                    onClick={openAddDialog}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('adAdd')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex px-4 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('ads')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors',
                'border-b-2 -mb-px',
                activeTab === 'ads'
                  ? 'border-foreground text-foreground bg-muted'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30',
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              {t('advertisements')}
              {advertisements.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground">
                  {advertisements.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors',
                'border-b-2 -mb-px',
                activeTab === 'settings'
                  ? 'border-foreground text-foreground bg-muted'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30',
              )}
            >
              <Sliders className="w-3.5 h-3.5" />
              {t('adDisplaySettings')}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CONTENT */}
        {/* ============================================================== */}
        <ScrollArea className="flex-1">
          {activeTab === 'ads' ? (
            // ============================================================
            // ADVERTISEMENTS LIST
            // ============================================================
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
                </div>
              ) : advertisements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Layers className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('noAdvertisements')}
                  </p>
                  <p className="text-xs text-muted-foreground mb-5">
                    {t('addTextOrImageAnnouncements')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openAddDialog}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('adAdd')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Rotation interval inline */}
                  <div className="flex items-center justify-between px-1 py-2 mb-2">
                    <span className="text-xs text-muted-foreground">
                      {t('adRotationInterval')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={300}
                        value={rotationInterval}
                        onChange={(e) =>
                          setRotationInterval(Number(e.target.value))
                        }
                        className="h-7 w-14 text-xs text-center font-mono"
                      />
                      <span className="text-xs text-muted-foreground">
                        {t('seconds')}
                      </span>
                    </div>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={advertisements.map((ad) => ad.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {advertisements.map((ad) => (
                        <SortableAdCard
                          key={ad.id}
                          ad={ad}
                          isActive={currentAd?.id === ad.id && isAdVisible}
                          onShow={() => showAdvertisement(ad)}
                          onEdit={() => openEditDialog(ad)}
                          onDelete={() => setDeletingAdId(ad.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          ) : (
            // ============================================================
            // GLOBAL SETTINGS
            // ============================================================
            <div className="p-4 space-y-6">
              {/* Position */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('adPosition')}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {positionOptions.map((opt) => {
                    const isActive = displaySettings.position === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          updateDisplaySettings({ position: opt.value })
                        }
                        className={cn(
                          'relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                          isActive
                            ? 'border-foreground bg-muted'
                            : 'border-border hover:border-border hover:bg-muted/30',
                        )}
                      >
                        {/* Mini preview */}
                        <div className="w-full h-8 rounded bg-muted relative overflow-hidden">
                          <div
                            className={cn(
                              'absolute left-1 right-1 h-1.5 rounded-sm',
                              isActive ? 'bg-foreground' : 'bg-border',
                              opt.value === 'top' && 'top-1',
                              opt.value === 'middle' &&
                                'top-1/2 -translate-y-1/2',
                              opt.value === 'bottom' && 'bottom-1',
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            isActive
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Padding */}
              <PaddingControl
                padding={displaySettings.padding}
                onChange={(padding) => updateDisplaySettings({ padding })}
              />

              {/* Background */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('adBackgroundTransparent')}
                  </Label>
                  <Switch
                    checked={displaySettings.backgroundTransparent}
                    onCheckedChange={(checked) =>
                      updateDisplaySettings({ backgroundTransparent: checked })
                    }
                  />
                </div>

                {!displaySettings.backgroundTransparent && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={t('adBackgroundColor')}
                      className={cn(
                        'w-11 h-11 rounded-lg border-2 border-border',
                        'hover:border-foreground/30 transition-colors cursor-pointer',
                        'shadow-sm',
                      )}
                      style={{
                        backgroundColor: displaySettings.backgroundColor,
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = displaySettings.backgroundColor;
                        input.addEventListener('input', (e) => {
                          updateDisplaySettings({
                            backgroundColor: (e.target as HTMLInputElement)
                              .value,
                          });
                        });
                        input.click();
                      }}
                    />
                    <Input
                      value={displaySettings.backgroundColor}
                      onChange={(e) =>
                        updateDisplaySettings({
                          backgroundColor: e.target.value,
                        })
                      }
                      className="h-11 text-xs font-mono flex-1"
                      placeholder="#000000"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* ============================================================== */}
        {/* ADD/EDIT DIALOG */}
        {/* ============================================================== */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingAd ? (
                  <>
                    <Pencil className="w-4 h-4" />
                    {t('adEdit')}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {t('adAdd')}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Type selection - card style */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('adType')}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdType('text')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      adType === 'text'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-border hover:border-border hover:bg-muted/30',
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        adType === 'text'
                          ? 'bg-blue-500 text-white'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Type className="w-5 h-5" />
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        adType === 'text'
                          ? 'text-blue-500'
                          : 'text-muted-foreground',
                      )}
                    >
                      {t('adTypeText')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdType('image')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      adType === 'image'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border hover:border-border hover:bg-muted/30',
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        adType === 'image'
                          ? 'bg-amber-500 text-background'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        adType === 'image'
                          ? 'text-amber-500'
                          : 'text-muted-foreground',
                      )}
                    >
                      {t('adTypeImage')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('adContent')}
                </Label>
                {adType === 'text' ? (
                  <Textarea
                    value={adContent}
                    onChange={(e) => setAdContent(e.target.value)}
                    placeholder={t('adTextPlaceholder')}
                    className="min-h-[100px] resize-none"
                  />
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleImageSelect}
                      className={cn(
                        'w-full py-10 rounded-xl border-2 border-dashed transition-all',
                        'border-border hover:border-amber-500/50 hover:bg-amber-500/10',
                        adContent && 'border-amber-500/30 bg-amber-500/10',
                      )}
                    >
                      <div className="flex flex-col items-center gap-3">
                        {adContent ? (
                          <>
                            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-amber-500" />
                            </div>
                            <span className="text-xs text-muted-foreground max-w-[200px] truncate px-4">
                              {basename(adContent)}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <Upload className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {t('selectImage')}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Display style */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('adDisplayStyle')}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdDisplayStyle('fullscreen')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-lg border transition-all',
                      adDisplayStyle === 'fullscreen'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card border-border hover:border-border text-foreground',
                    )}
                  >
                    <Maximize className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {t('adFullscreen')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdDisplayStyle('banner')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-lg border transition-all',
                      adDisplayStyle === 'banner'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card border-border hover:border-border text-foreground',
                    )}
                  >
                    <PanelBottom className="w-4 h-4" />
                    <span className="text-xs font-medium">{t('adBanner')}</span>
                  </button>
                </div>
              </div>

              {/* Text-specific settings */}
              {adType === 'text' && (
                <>
                  {/* Text color */}
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('adTextColor')}
                    </Label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={t('adTextColor')}
                        className={cn(
                          'w-11 h-11 rounded-lg border-2 border-border',
                          'hover:border-foreground/30 transition-colors cursor-pointer',
                          'shadow-sm',
                        )}
                        style={{ backgroundColor: adTextColor }}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'color';
                          input.value = adTextColor;
                          input.addEventListener('input', (e) => {
                            setAdTextColor(
                              (e.target as HTMLInputElement).value,
                            );
                          });
                          input.click();
                        }}
                      />
                      <Input
                        value={adTextColor}
                        onChange={(e) => setAdTextColor(e.target.value)}
                        className="h-11 text-xs font-mono flex-1"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>

                  {/* Font size */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('fontSize')}
                      </Label>
                      <span className="text-xs font-mono text-muted-foreground">
                        {adFontSize}px
                      </span>
                    </div>
                    <Slider
                      value={[adFontSize]}
                      onValueChange={([v]) => setAdFontSize(v)}
                      min={24}
                      max={280}
                      step={2}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsAddDialogOpen(false)}
                className="px-4"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!adContent.trim()}
                className="px-5"
              >
                {editingAd ? t('save') : t('add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingAdId}
          onOpenChange={(open) => {
            if (!open) setDeletingAdId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmDeleteAdDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  if (deletingAdId) {
                    deleteAdvertisement(deletingAdId);
                    setDeletingAdId(null);
                  }
                }}
              >
                {t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
