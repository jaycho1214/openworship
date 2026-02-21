import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save,
  X,
  FileText,
  Loader2,
  AlertCircle,
  FileImage,
  Library,
  Check,
  CheckSquare,
  Square,
  MinusSquare,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { useSetlist } from '../context';
import { Song, Slide } from '../../shared/types/song';
import {
  parseLyricsToSlides,
  slidesToRawLyrics,
} from '../../shared/utils/lyricsParser';
import {
  isOcrFile,
  isPdfFile,
  readFileAsBase64,
  getFileMimeType,
  MAX_OCR_FILE_SIZE,
} from '../../shared/utils/fileHelpers';
import { cn } from '../../lib/utils';

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

// Type for bulk import item
interface ImportItem {
  id: string;
  index: number;
  title: string;
  lyrics: string;
  imagePreview?: string;
  success: boolean;
  error?: string;
  selected: boolean;
  pageNumber?: number;
}

interface SongEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: Song | null;
  /** If true, shows "add to library" option */
  showAddToLibrary?: boolean;
  /** If provided, this is called for library additions instead of session */
  onAddToLibrary?: (song: { title: string; lyrics: string }) => Promise<void>;
  /** Called when a song is added to session */
  onAddToSession?: (song: { title: string; lyrics: string }) => void;
  /** Generic save handler - if provided, completely overrides default save behavior */
  onSave?: (song: { title: string; lyrics: string }) => Promise<void> | void;
}

export default function SongEditor({
  open,
  onOpenChange,
  song,
  showAddToLibrary = false,
  onAddToLibrary,
  onAddToSession,
  onSave,
}: SongEditorProps) {
  const { t } = useTranslation();
  const { addSong, updateSong } = useSetlist();

  // Edit mode state (for editing existing songs)
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [previewSlides, setPreviewSlides] = useState<Slide[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Bulk import state
  const [bulkItems, setBulkItems] = useState<ImportItem[]>([]);
  const [editingItem, setEditingItem] = useState<ImportItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLyrics, setEditLyrics] = useState('');
  const [addToLibrary, setAddToLibrary] = useState(false);

  // Shared state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({
    current: 0,
    total: 0,
  });
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Bulk selection helpers
  const successfulItems = bulkItems.filter((i) => i.success);
  const selectedItems = bulkItems.filter((i) => i.selected && i.success);
  const allSelected =
    successfulItems.length > 0 &&
    selectedItems.length === successfulItems.length;
  const someSelected =
    selectedItems.length > 0 && selectedItems.length < successfulItems.length;

  // Check if we're in edit mode (editing existing song)
  const isEditMode = song !== null;

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (song) {
        setTitle(song.title);
        setLyrics(slidesToRawLyrics(song.slides));
      } else {
        setTitle('');
        setLyrics('');
      }
      setError(null);
      setAddToLibrary(false);
      setBulkItems([]);
      setEditingItem(null);
    }
  }, [open, song]);

  // Update preview when lyrics change (edit mode)
  useEffect(() => {
    if (isEditMode) {
      const slides = parseLyricsToSlides(lyrics);
      setPreviewSlides(slides);
    }
  }, [lyrics, isEditMode]);

  // Process image/PDF files with OCR
  const processFiles = useCallback(
    async (files: File[]) => {
      const ocrFiles = files.filter(isOcrFile);

      if (ocrFiles.length === 0) return;

      // Check file size limits
      const oversized = ocrFiles.filter((f) => f.size > MAX_OCR_FILE_SIZE);
      if (oversized.length > 0) {
        setError(
          `${oversized.map((f) => f.name).join(', ')}: ${t('fileTooLarge')}`,
        );
        return;
      }

      const electron = getElectron();
      if (!electron) return;

      setIsProcessing(true);
      setError(null);

      const allItems: ImportItem[] = [...bulkItems];

      try {
        const hasPdfs = ocrFiles.some(isPdfFile);
        setProcessingMessage(
          hasPdfs ? t('processingFiles') : t('processingImages'),
        );
        setProcessingProgress({ current: 0, total: ocrFiles.length });

        // Build batch payload — parseImages handles PDF multi-song expansion
        const payload = await Promise.all(
          ocrFiles.map(async (file) => {
            const base64 = await readFileAsBase64(file);
            return {
              base64,
              mimeType: getFileMimeType(file),
              filename: file.name,
            };
          }),
        );

        const batchResult = await electron.ocr.parseImages(payload);

        if (!batchResult.success || !batchResult.data) {
          setError(batchResult.error || t('ocrError'));
          return;
        }

        for (const item of batchResult.data) {
          if (item.success && item.data) {
            // Check library for existing song
            const libraryResult = await electron.library.findByTitle(
              item.data.title,
            );
            const songData =
              libraryResult.success && libraryResult.data
                ? libraryResult.data
                : item.data;

            allItems.push({
              id: uuidv4(),
              index: allItems.length,
              title: songData.title || t('untitledSong'),
              lyrics: songData.lyrics || '',
              imagePreview: item.imagePreview,
              success: true,
              selected: true,
              pageNumber: item.pageNumber,
            });
          } else {
            allItems.push({
              id: uuidv4(),
              index: allItems.length,
              title: t('untitledSong'),
              lyrics: '',
              imagePreview: item.imagePreview,
              success: false,
              error: item.error || t('ocrError'),
              selected: false,
            });
          }
        }

        setBulkItems(allItems);
      } catch (err) {
        console.error('[SongEditor] Processing error:', err);
        setError(err instanceof Error ? err.message : t('ocrError'));
      } finally {
        setIsProcessing(false);
        setProcessingProgress({ current: 0, total: 0 });
        setProcessingMessage('');
      }
    },
    [bulkItems, t],
  );

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle paste event
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        processFiles(files);
      }
    },
    [processFiles],
  );

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Edit mode: Save existing song
  const handleSaveEdit = async () => {
    if (!title.trim() || !song) return;

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({ title: title.trim(), lyrics });
      } else {
        updateSong(song.id, title.trim(), lyrics);
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk mode: Toggle all
  const handleToggleAll = () => {
    const newSelected = !allSelected;
    setBulkItems(
      bulkItems.map((item) => ({
        ...item,
        selected: item.success ? newSelected : false,
      })),
    );
  };

  // Bulk mode: Toggle single item
  const handleToggleItem = (id: string) => {
    setBulkItems(
      bulkItems.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  // Bulk mode: Start editing item
  const handleStartEditItem = (item: ImportItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditLyrics(item.lyrics);
  };

  // Bulk mode: Save item edit
  const handleSaveItemEdit = () => {
    if (!editingItem) return;
    setBulkItems(
      bulkItems.map((item) =>
        item.id === editingItem.id
          ? { ...item, title: editTitle, lyrics: editLyrics }
          : item,
      ),
    );
    setEditingItem(null);
  };

  // Bulk mode: Remove item
  const handleRemoveItem = (id: string) => {
    setBulkItems(bulkItems.filter((item) => item.id !== id));
  };

  // Bulk mode: Import selected
  const handleBulkImport = async () => {
    setIsSaving(true);
    try {
      for (const item of selectedItems) {
        if (item.success && item.title && item.lyrics) {
          if (onAddToSession) {
            onAddToSession({ title: item.title, lyrics: item.lyrics });
          } else {
            addSong(item.title, item.lyrics);
          }

          if (addToLibrary && onAddToLibrary) {
            await onAddToLibrary({ title: item.title, lyrics: item.lyrics });
          }
        }
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] bg-background border-border p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border/50 pr-12">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-foreground" />
            {isEditMode ? t('editSong') : t('bulkImport')}
            {!isEditMode && bulkItems.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {selectedItems.length} / {successfulItems.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Full-dialog processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-40 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-foreground animate-spin mb-4" />
            <p className="text-sm font-medium text-foreground mb-2">
              {processingMessage || t('processingFiles')}
            </p>
            {processingProgress.total > 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {processingProgress.current} / {processingProgress.total}
                </p>
                <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-300 ease-out"
                    style={{
                      width: `${(processingProgress.current / processingProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden" onPaste={handlePaste}>
          {isEditMode ? (
            /* ============== EDIT MODE (existing song) ============== */
            <>
              {/* Left: Input */}
              <div className="flex-1 flex flex-col border-r border-border/50">
                <div className="px-4 py-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="title"
                      className="text-xs text-muted-foreground"
                    >
                      {t('songTitle')}
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('songTitlePlaceholder')}
                      className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="flex-1 px-4 pb-4 flex flex-col min-h-0">
                  <Label
                    htmlFor="lyrics"
                    className="text-xs text-muted-foreground mb-1.5"
                  >
                    {t('lyrics')}
                  </Label>
                  <Textarea
                    id="lyrics"
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder={t('lyricsPlaceholder')}
                    className="flex-1 resize-none bg-muted/50 border-border text-foreground placeholder:text-muted-foreground font-mono text-sm leading-relaxed"
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {t('lyricsHint')}
                  </p>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="w-80 flex flex-col bg-card/50">
                <div className="px-4 py-3 border-b border-border/50">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    {t('slidePreview')} ({previewSlides.length} {t('slides')})
                  </h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2 w-full">
                    {previewSlides.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-muted-foreground">
                          {t('noSlides')}
                        </p>
                      </div>
                    ) : (
                      previewSlides.map((slide, index) => (
                        <div
                          key={slide.id}
                          className="p-3 rounded-lg bg-muted/30 border border-border/30"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {index + 1}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {slide.lines.map((line, lineIndex) => (
                              <p
                                key={lineIndex}
                                className="text-xs text-foreground leading-relaxed"
                              >
                                {line || (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          ) : (
            /* ============== BULK IMPORT MODE ============== */
            <>
              {/* Left: Drop Zone + Item List */}
              <div className="flex-1 flex flex-col border-r border-border/50">
                {/* Drop Zone */}
                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    'mx-4 mt-4 p-6 rounded-lg border-2 border-dashed transition-all cursor-pointer',
                    dragOver
                      ? 'border-foreground bg-muted'
                      : 'border-border bg-muted/30 hover:border-muted-foreground hover:bg-muted/50',
                    isProcessing && 'pointer-events-none',
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="w-8 h-8 text-foreground animate-spin" />
                      <p className="text-sm text-foreground font-medium">
                        {t('extractingLyrics')}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <FileImage className="w-10 h-10 text-muted-foreground" />
                      <p className="text-sm text-foreground font-medium">
                        {t('pasteLyricsImage')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('dragDropOrClick')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="mx-4 mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Selection Header */}
                {bulkItems.length > 0 && (
                  <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between mt-4">
                    <button
                      onClick={handleToggleAll}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      disabled={successfulItems.length === 0}
                    >
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4 text-foreground" />
                      ) : someSelected ? (
                        <MinusSquare className="w-4 h-4 text-foreground" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <span className="text-xs font-medium">
                        {selectedItems.length > 0
                          ? `${selectedItems.length}${t('selectCount')}`
                          : t('selectAll')}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-400" />
                        {successfulItems.length}
                      </span>
                      {bulkItems.length - successfulItems.length > 0 && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-400" />
                          {bulkItems.length - successfulItems.length}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Item List */}
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {bulkItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-sm text-muted-foreground">
                          {t('noItemsToImport')}
                        </p>
                      </div>
                    ) : (
                      bulkItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'group relative rounded-lg border-2 transition-all',
                            'hover:border-muted-foreground/50',
                            item.selected && item.success
                              ? 'border-foreground/50 bg-muted/50'
                              : 'border-border bg-card/30',
                            !item.success &&
                              'opacity-60 border-red-500/30 bg-red-500/5',
                          )}
                        >
                          <div className="flex gap-3 p-3">
                            {/* Thumbnail */}
                            <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                              {item.imagePreview ? (
                                <img
                                  src={item.imagePreview}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 flex flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {item.pageNumber !== undefined && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4"
                                      >
                                        P.{item.pageNumber}
                                      </Badge>
                                    )}
                                    {item.success ? (
                                      <Check className="w-3.5 h-3.5 text-green-400" />
                                    ) : (
                                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                    )}
                                  </div>
                                  <h4 className="text-sm font-semibold text-foreground truncate">
                                    {item.title || t('untitledSong')}
                                  </h4>
                                </div>

                                {/* Selection checkbox */}
                                {item.success && (
                                  <button
                                    onClick={() => handleToggleItem(item.id)}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                  >
                                    {item.selected ? (
                                      <CheckSquare className="w-5 h-5 text-foreground" />
                                    ) : (
                                      <Square className="w-5 h-5 text-muted-foreground" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Lyrics preview or error */}
                              {item.success ? (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {item.lyrics
                                    .replace(/\n/g, ' ')
                                    .substring(0, 100)}
                                  {item.lyrics.length > 100 && '...'}
                                </p>
                              ) : (
                                <p className="text-xs text-red-400 mt-1">
                                  {item.error || t('ocrError')}
                                </p>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-1 mt-auto pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.success && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => handleStartEditItem(item)}
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    {t('edit')}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-red-400"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  {t('delete')}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Edit Panel */}
              <div className="w-96 flex flex-col bg-card/50">
                {editingItem ? (
                  <>
                    <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('editSong')}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditingItem(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                      {/* Image preview */}
                      {editingItem.imagePreview && (
                        <div className="w-full h-40 rounded-lg overflow-hidden bg-muted border border-border/50 flex-shrink-0">
                          <img
                            src={editingItem.imagePreview}
                            alt={editingItem.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      {/* Title */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          {t('songTitle')}
                        </label>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder={t('songTitlePlaceholder')}
                          className="bg-muted/50 border-border"
                        />
                      </div>

                      {/* Lyrics */}
                      <div className="flex-1 flex flex-col min-h-0">
                        <label className="text-xs text-muted-foreground mb-1.5">
                          {t('lyrics')}
                        </label>
                        <Textarea
                          value={editLyrics}
                          onChange={(e) => setEditLyrics(e.target.value)}
                          placeholder={t('enterLyrics')}
                          className="flex-1 resize-none bg-muted/50 border-border font-mono text-sm"
                        />
                      </div>

                      {/* Save button */}
                      <Button
                        onClick={handleSaveItemEdit}
                        disabled={!editTitle.trim()}
                        className="w-full bg-foreground text-background hover:bg-foreground/90"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        {t('save')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Pencil className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('selectItemToEdit')}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
          {/* Add to Library Switch */}
          {!isEditMode && showAddToLibrary && onAddToLibrary && (
            <div className="flex items-center gap-2">
              <Switch
                id="add-to-library"
                checked={addToLibrary}
                onCheckedChange={setAddToLibrary}
              />
              <Label
                htmlFor="add-to-library"
                className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5"
              >
                <Library className="w-3.5 h-3.5" />
                {t('addToLibrary')}
              </Label>
            </div>
          )}
          {(isEditMode || !showAddToLibrary || !onAddToLibrary) && (
            <div>
              {!isEditMode && bulkItems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedItems.length > 0
                    ? `${selectedItems.length}${t('songsToImport')}`
                    : t('selectSongsToImport')}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              {t('cancel')}
            </Button>

            {isEditMode ? (
              <Button
                onClick={handleSaveEdit}
                disabled={!title.trim() || isSaving}
                className="bg-foreground text-background hover:bg-foreground/90 font-semibold"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                {t('save')}
              </Button>
            ) : (
              <Button
                onClick={handleBulkImport}
                disabled={selectedItems.length === 0 || isSaving}
                className="bg-foreground text-background hover:bg-foreground/90 font-semibold"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                {t('importToSession')} ({selectedItems.length})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
