/* eslint-disable no-console */
import { useState, useCallback, DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Frame,
  Plus,
  Trash2,
  Upload,
  Loader2,
  ImagePlus,
  Pencil,
  Music,
  BookOpen,
  Megaphone,
} from 'lucide-react';
import { getElectron } from '@/shared/hooks/useElectron';
import { useFrame } from '../../../context';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../components/ui/dialog';
import { SetlistItemType } from '../../../../../shared/types/setlistItem';
import { Frame as FrameType } from '../../../../../shared/types/frame';
import { getFrameStyle } from '../../../../shared/utils/frameStyles';
import { toFileUrl } from '../../../../shared/utils/fileUrl';
import { Separator } from '../../../../components/ui/separator';
import { SettingsRow } from '../components/SettingsRow';
import { cn } from '../../../../lib/utils';

// Supported image extensions for drag-and-drop
const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg'];

export function FrameSettingsTab() {
  const { t } = useTranslation();
  const {
    frames,
    settings,
    isLoading,
    addFrame,
    updateFrame,
    deleteFrame,
    importFrameImage,
    setFrameForType,
  } = useFrame();

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameImagePath, setNewFrameImagePath] = useState<string | null>(
    null,
  );
  const [newFrameSliceSize, setNewFrameSliceSize] = useState(30);
  const [newFramePadding, setNewFramePadding] = useState({
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFrame, setEditingFrame] = useState<FrameType | null>(null);
  const [editFrameName, setEditFrameName] = useState('');
  const [editFrameSliceSize, setEditFrameSliceSize] = useState(30);
  const [editFramePadding, setEditFramePadding] = useState({
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isEditDragging, setIsEditDragging] = useState(false);

  // Validate if dropped file is a supported image
  const isValidImageFile = useCallback((fileName: string) => {
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
  }, []);

  // Extract file path from drag event (works in Electron)
  const getFilePathFromDrop = useCallback(
    (e: DragEvent<HTMLElement>): string | null => {
      const files = e.dataTransfer.files;
      if (files.length === 0) return null;

      const file = files[0];
      if (!isValidImageFile(file.name)) return null;

      // Use Electron's webUtils to get the file path
      try {
        const electron = getElectron();
        if (electron?.utils?.getPathForFile) {
          return electron.utils.getPathForFile(file);
        }
      } catch (error) {
        console.error('Failed to get file path:', error);
      }

      return null;
    },
    [isValidImageFile],
  );

  // Handle drag over for add dialog
  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const filePath = getFilePathFromDrop(e);
      if (filePath) {
        setNewFrameImagePath(filePath);
        if (!newFrameName) {
          // Extract filename without extension
          const pathParts = filePath.replace(/\\/g, '/').split('/');
          const fileName = pathParts.pop() || '';
          const nameWithoutExt = fileName.split('.').slice(0, -1).join('.');
          setNewFrameName(nameWithoutExt);
        }
      }
    },
    [getFilePathFromDrop, newFrameName],
  );

  // Handle drag over for edit dialog
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEditDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(true);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEditDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(false);
  }, []);

  const handleSelectImage = async () => {
    const imagePath = await importFrameImage();
    if (imagePath) {
      setNewFrameImagePath(imagePath);
      if (!newFrameName) {
        // Handle both forward and back slashes for cross-platform
        const pathParts = imagePath.replace(/\\/g, '/').split('/');
        const fileName = pathParts.pop() || '';
        const nameWithoutExt = fileName.split('.').slice(0, -1).join('.');
        setNewFrameName(nameWithoutExt);
      }
    }
  };

  const handleAddFrame = async () => {
    if (!newFrameName || !newFrameImagePath) return;

    await addFrame({
      type: 'image',
      name: newFrameName,
      imagePath: newFrameImagePath,
      sliceSize: newFrameSliceSize,
      padding: newFramePadding,
    });

    setNewFrameName('');
    setNewFrameImagePath(null);
    setNewFrameSliceSize(30);
    setNewFramePadding({ top: 20, right: 20, bottom: 20, left: 20 });
    setShowAddDialog(false);
  };

  const handleDeleteFrame = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteFrame(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFrameAssignment = async (
    type: SetlistItemType,
    frameId: string | null,
  ) => {
    await setFrameForType(type, frameId);
  };

  // Edit frame handlers
  const handleOpenEditDialog = (frame: FrameType) => {
    setEditingFrame(frame);
    setEditFrameName(frame.name);
    setEditFrameSliceSize(frame.sliceSize || 30);
    setEditFramePadding(
      frame.padding || { top: 20, right: 20, bottom: 20, left: 20 },
    );
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingFrame(null);
    setEditFrameName('');
    setEditFrameSliceSize(30);
    setEditFramePadding({ top: 20, right: 20, bottom: 20, left: 20 });
    setIsEditDragging(false);
  };

  const handleUpdateFrame = async () => {
    if (!editingFrame || !editFrameName) return;

    await updateFrame(editingFrame.id, {
      name: editFrameName,
      sliceSize: editFrameSliceSize,
      padding: editFramePadding,
    });

    handleCloseEditDialog();
  };

  const contentTypes: {
    type: SetlistItemType;
    label: string;
    icon: typeof Music;
  }[] = [
    {
      type: 'song',
      label: t('contentTypeSong'),
      icon: Music,
    },
    {
      type: 'bible',
      label: t('contentTypeBible'),
      icon: BookOpen,
    },
    {
      type: 'announcement',
      label: t('contentTypeAnnouncement'),
      icon: Megaphone,
    },
  ];

  const frameSelect = (type: SetlistItemType) => {
    const frameId =
      type === 'song'
        ? settings.songFrameId
        : type === 'bible'
          ? settings.bibleFrameId
          : settings.announcementFrameId;

    return (
      <Select
        value={frameId || 'none'}
        onValueChange={(value) =>
          handleFrameAssignment(type, value === 'none' ? null : value)
        }
      >
        <SelectTrigger className="w-[140px] bg-muted/30 h-8 text-xs">
          <SelectValue placeholder={t('frame.selectFrame', 'Select frame')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs">
            <span className="text-muted-foreground">
              {t('frame.noFrame', 'No frame')}
            </span>
          </SelectItem>
          {frames.map((frame) => (
            <SelectItem key={frame.id} value={frame.id} className="text-xs">
              <span className="truncate max-w-[180px] block">{frame.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="space-y-3 pb-4 animate-in fade-in duration-200">
      {/* Content Frame Assignments */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Frame className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[13px] font-medium">
            {t('frame.contentFrames', 'Content Frames')}
          </h3>
        </div>

        {contentTypes.map(({ type, label, icon: Icon }) => (
          <SettingsRow
            key={type}
            title={
              <span className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {label}
              </span>
            }
          >
            {frameSelect(type)}
          </SettingsRow>
        ))}
      </section>

      {/* Divider */}
      <Separator className="-mx-5 w-[calc(100%+2.5rem)]" />

      {/* Frame Library */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[13px] font-medium">
              {t('frame.frameLibrary', 'Frame Library')}
            </h3>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('frame.addFrame', 'Add Frame')}
          </Button>
        </div>

        {frames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Frame className="h-5 w-5 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('frame.noFrames', 'No frames added')}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t('frame.addFrameHint', 'Add a frame image to use as a border')}
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              size="sm"
              variant="outline"
              className="mt-3 h-7 text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('frame.addFrame', 'Add Frame')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {frames.map((frame) => (
              <div
                key={frame.id}
                className={cn(
                  'group relative rounded-lg overflow-hidden',
                  'border border-border/50 hover:border-border',
                  'bg-muted/20',
                  'transition-colors duration-150',
                )}
              >
                {/* Frame Preview */}
                <div className="relative h-24 overflow-hidden bg-muted/30">
                  {frame.type === 'image' && frame.imagePath ? (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url('${toFileUrl(frame.imagePath)}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-16 h-16 rounded-lg flex items-center justify-center text-xs text-muted-foreground font-mono"
                        style={getFrameStyle(frame) as React.CSSProperties}
                      >
                        CSS
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7',
                        'bg-background/80 backdrop-blur-sm',
                        'opacity-0 group-hover:opacity-100',
                        'hover:bg-primary hover:text-primary-foreground',
                        'transition-all duration-150',
                      )}
                      onClick={() => handleOpenEditDialog(frame)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-7 w-7',
                            'bg-background/80 backdrop-blur-sm',
                            'opacity-0 group-hover:opacity-100',
                            'hover:bg-destructive hover:text-destructive-foreground',
                            'transition-all duration-150',
                          )}
                          disabled={deletingId === frame.id}
                        >
                          {deletingId === frame.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('frame.deleteConfirmTitle', 'Delete Frame?')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t(
                              'frame.deleteConfirmDescription',
                              'This will permanently delete "{{name}}". This action cannot be undone.',
                              { name: frame.name },
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t('common.cancel', 'Cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteFrame(frame.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('common.delete', 'Delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Frame Info */}
                <div className="px-2.5 py-2">
                  <p className="text-xs font-medium truncate">{frame.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {frame.type === 'image'
                      ? `${frame.sliceSize}${t('pxCorner')}`
                      : t('cssFrame')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Frame Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Frame className="h-4 w-4 text-primary" />
              </div>
              {t('frame.addFrame', 'Add Frame')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Image Selection with Drag & Drop */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {t('frame.frameImage', 'Frame Image')}
              </Label>
              {newFrameImagePath ? (
                <div
                  className={cn(
                    'relative rounded-xl overflow-hidden',
                    'border border-border',
                    'bg-gradient-to-br from-muted/50 to-muted/20',
                    isDragging && 'border-primary border-2',
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <img
                    src={toFileUrl(newFrameImagePath)}
                    alt={t('framePreview')}
                    className="w-full h-24 object-contain pointer-events-none"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className={cn(
                      'absolute bottom-3 right-3 h-8 text-xs',
                      'bg-background/90 backdrop-blur-sm',
                      'border border-border/50',
                    )}
                    onClick={handleSelectImage}
                  >
                    {t('frame.changeImage', 'Change')}
                  </Button>
                  {isDragging && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                      <p className="text-sm font-medium text-primary">
                        {t('frame.dropToReplace', 'Drop to replace')}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={handleSelectImage}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    'w-full h-24 rounded-xl cursor-pointer',
                    'border-2 border-dashed',
                    isDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 bg-gradient-to-br from-muted/20 via-muted/10 to-transparent',
                    'flex flex-col items-center justify-center gap-2',
                    'text-muted-foreground',
                    'hover:border-primary/50 hover:bg-primary/5',
                    'transition-all duration-300',
                    'group',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isDragging
                        ? 'bg-primary/20'
                        : 'bg-muted/50 group-hover:bg-primary/10',
                      'transition-colors duration-300',
                    )}
                  >
                    <Upload
                      className={cn(
                        'h-4 w-4 transition-colors duration-300',
                        isDragging
                          ? 'text-primary'
                          : 'group-hover:text-primary',
                      )}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {isDragging
                      ? t('frame.dropImage', 'Drop image here')
                      : t('frame.selectOrDrop', 'Click or drop image')}
                  </span>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t(
                  'frame.imageHint',
                  'PNG or SVG recommended for best quality',
                )}
              </p>
            </div>

            {/* Name and Slice Size - compact row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="frame-name" className="text-xs font-medium">
                  {t('frame.frameName', 'Name')}
                </Label>
                <Input
                  id="frame-name"
                  value={newFrameName}
                  onChange={(e) => setNewFrameName(e.target.value)}
                  placeholder={t('frame.namePlaceholder', 'Enter frame name')}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="slice-size" className="text-xs font-medium">
                  {t('frame.sliceSize', 'Corner Size (pixels)')}
                </Label>
                <Input
                  id="slice-size"
                  type="number"
                  min={1}
                  max={200}
                  value={newFrameSliceSize}
                  onChange={(e) =>
                    setNewFrameSliceSize(parseInt(e.target.value, 10) || 30)
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Padding Controls - compact */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                {t('frame.padding', 'Content Padding (pixels)')}
              </Label>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="new-padding-top"
                    className="text-[10px] text-muted-foreground"
                  >
                    {t('frame.paddingTop', 'Top')}
                  </Label>
                  <Input
                    id="new-padding-top"
                    type="number"
                    min={0}
                    max={200}
                    value={newFramePadding.top}
                    onChange={(e) =>
                      setNewFramePadding((p) => ({
                        ...p,
                        top: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="new-padding-right"
                    className="text-[10px] text-muted-foreground"
                  >
                    {t('frame.paddingRight', 'Right')}
                  </Label>
                  <Input
                    id="new-padding-right"
                    type="number"
                    min={0}
                    max={200}
                    value={newFramePadding.right}
                    onChange={(e) =>
                      setNewFramePadding((p) => ({
                        ...p,
                        right: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="new-padding-bottom"
                    className="text-[10px] text-muted-foreground"
                  >
                    {t('frame.paddingBottom', 'Bottom')}
                  </Label>
                  <Input
                    id="new-padding-bottom"
                    type="number"
                    min={0}
                    max={200}
                    value={newFramePadding.bottom}
                    onChange={(e) =>
                      setNewFramePadding((p) => ({
                        ...p,
                        bottom: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="new-padding-left"
                    className="text-[10px] text-muted-foreground"
                  >
                    {t('frame.paddingLeft', 'Left')}
                  </Label>
                  <Input
                    id="new-padding-left"
                    type="number"
                    min={0}
                    max={200}
                    value={newFramePadding.left}
                    onChange={(e) =>
                      setNewFramePadding((p) => ({
                        ...p,
                        left: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview - larger */}
            {newFrameImagePath && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  {t('frame.livePreview', 'Live Preview')}
                </Label>
                <div
                  className={cn(
                    'relative rounded-lg',
                    'bg-gradient-to-br from-slate-900 to-slate-800',
                    'h-56 flex items-center justify-center',
                  )}
                  style={{
                    padding: `${Math.max(newFrameSliceSize, 20)}px`,
                  }}
                >
                  <div
                    className="flex items-center justify-center text-white text-xl font-bold"
                    style={{
                      borderImageSource: `url('${toFileUrl(newFrameImagePath)}')`,
                      borderImageSlice: `${newFrameSliceSize} fill`,
                      borderImageWidth: `${newFrameSliceSize}px`,
                      borderImageRepeat: 'stretch',
                      padding: `${newFramePadding.top}px ${newFramePadding.right}px ${newFramePadding.bottom}px ${newFramePadding.left}px`,
                    }}
                  >
                    {t('frame.sampleText', 'Sample Text')}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="h-9"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleAddFrame}
              disabled={!newFrameName || !newFrameImagePath || isLoading}
              className="h-9"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('frame.addFrame', 'Add Frame')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Frame Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              {t('frame.editFrame', 'Edit Frame')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Name and Slice Size - compact row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="edit-frame-name"
                  className="text-xs font-medium"
                >
                  {t('frame.frameName', 'Name')}
                </Label>
                <Input
                  id="edit-frame-name"
                  value={editFrameName}
                  onChange={(e) => setEditFrameName(e.target.value)}
                  placeholder={t('frame.namePlaceholder', 'Enter frame name')}
                  className="h-8 text-sm"
                />
              </div>
              {editingFrame?.type === 'image' && (
                <div className="space-y-1">
                  <Label
                    htmlFor="edit-slice-size"
                    className="text-xs font-medium"
                  >
                    {t('frame.sliceSize', 'Corner Size (pixels)')}
                  </Label>
                  <Input
                    id="edit-slice-size"
                    type="number"
                    min={1}
                    max={200}
                    value={editFrameSliceSize}
                    onChange={(e) =>
                      setEditFrameSliceSize(parseInt(e.target.value, 10) || 30)
                    }
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Padding Controls - compact */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                {t('frame.padding', 'Content Padding (pixels)')}
              </Label>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="edit-padding-top"
                    className="text-[10px] text-muted-foreground"
                  >
                    {t('frame.paddingTop', 'Top')}
                  </Label>
                  <Input
                    id="edit-padding-top"
                    type="number"
                    min={0}
                    max={200}
                    value={editFramePadding.top}
                    onChange={(e) =>
                      setEditFramePadding((p) => ({
                        ...p,
                        top: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="edit-padding-right"
                    className="text-[10px] text-muted-foreground"
                  >
                    {t('frame.paddingRight', 'Right')}
                  </Label>
                  <Input
                    id="edit-padding-right"
                    type="number"
                    min={0}
                    max={200}
                    value={editFramePadding.right}
                    onChange={(e) =>
                      setEditFramePadding((p) => ({
                        ...p,
                        right: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="edit-padding-bottom"
                    className="text-[10px] text-muted-foreground"
                  >
                    {t('frame.paddingBottom', 'Bottom')}
                  </Label>
                  <Input
                    id="edit-padding-bottom"
                    type="number"
                    min={0}
                    max={200}
                    value={editFramePadding.bottom}
                    onChange={(e) =>
                      setEditFramePadding((p) => ({
                        ...p,
                        bottom: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="edit-padding-left"
                    className="text-[10px] text-muted-foreground"
                  >
                    {t('frame.paddingLeft', 'Left')}
                  </Label>
                  <Input
                    id="edit-padding-left"
                    type="number"
                    min={0}
                    max={200}
                    value={editFramePadding.left}
                    onChange={(e) =>
                      setEditFramePadding((p) => ({
                        ...p,
                        left: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview - larger */}
            {editingFrame?.type === 'image' && editingFrame?.imagePath && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  {t('frame.livePreview', 'Live Preview')}
                </Label>
                <div
                  className={cn(
                    'relative rounded-lg',
                    'bg-gradient-to-br from-slate-900 to-slate-800',
                    'h-56 flex items-center justify-center',
                  )}
                  style={{
                    padding: `${Math.max(editFrameSliceSize, 20)}px`,
                  }}
                >
                  <div
                    className="flex items-center justify-center text-white text-xl font-bold"
                    style={{
                      borderImageSource: `url('${toFileUrl(editingFrame.imagePath)}')`,
                      borderImageSlice: `${editFrameSliceSize} fill`,
                      borderImageWidth: `${editFrameSliceSize}px`,
                      borderImageRepeat: 'stretch',
                      padding: `${editFramePadding.top}px ${editFramePadding.right}px ${editFramePadding.bottom}px ${editFramePadding.left}px`,
                    }}
                  >
                    {t('frame.sampleText', 'Sample Text')}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCloseEditDialog}
              className="h-9"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleUpdateFrame}
              disabled={!editFrameName || isLoading}
              className="h-9"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
