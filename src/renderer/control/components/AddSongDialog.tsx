/* eslint-disable no-console */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
  FileImage,
  Library,
  BookOpen,
  Copy,
  Upload,
  FolderPlus,
  FolderOpen,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { parseLyricsToSlides } from '../../shared/utils/lyricsParser';
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

// Type for manual entry item
interface ManualSongEntry {
  id: string;
  title: string;
  lyrics: string;
}

// Type for existing song found by title
interface ExistingSong {
  id: string;
  title: string;
  lyrics: string;
  updatedAt: string;
}

// Type for session
interface SessionOption {
  id: string;
  name: string;
}

// Session target options
type SessionTarget = 'library-only' | 'new-session' | string; // string = existing session ID

interface AddSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when songs are added to the library */
  onAddToLibrary: (
    songs: { title: string; lyrics: string }[],
    sessionTarget: SessionTarget,
    newSessionName?: string,
  ) => Promise<void>;
  /** Current session ID if any */
  currentSessionId?: string | null;
}

export default function AddSongDialog({
  open,
  onOpenChange,
  onAddToLibrary,
  currentSessionId,
}: AddSongDialogProps) {
  const { t } = useTranslation();

  // Full-page drag overlay state
  const [showDragOverlay, setShowDragOverlay] = useState(false);
  const dragCounterRef = useRef(0);

  // Manual entry state
  const [manualEntries, setManualEntries] = useState<ManualSongEntry[]>([
    { id: uuidv4(), title: '', lyrics: '' },
  ]);
  const [activeEntryIndex, setActiveEntryIndex] = useState(0);

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState<
    Record<string, ExistingSong | null>
  >({});
  const [checkingDuplicate, setCheckingDuplicate] = useState<string | null>(
    null,
  );

  // Session selection state
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionTarget, setSessionTarget] =
    useState<SessionTarget>('library-only');
  const [newSessionName, setNewSessionName] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Shared state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({
    current: 0,
    total: 0,
  });
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if API key is set and load sessions on mount
  useEffect(() => {
    if (open) {
      const electron = getElectron();
      if (electron) {
        // Check API key
        electron.settings
          .hasApiKey()
          .then((has: boolean) => {
            setHasApiKey(has);
            return null;
          })
          .catch(() => {
            setHasApiKey(false);
          });

        // Load sessions
        setIsLoadingSessions(true);
        // eslint-disable-next-line promise/catch-or-return
        electron.session
          .getAll()
          .then((result: { success: boolean; data?: SessionOption[] }) => {
            if (result.success && result.data) {
              setSessions(result.data);
            }
            return null;
          })
          .catch(() => {
            setSessions([]);
          })
          .finally(() => {
            setIsLoadingSessions(false);
          });
      } else {
        setHasApiKey(false);
        setSessions([]);
      }
    }
  }, [open]);

  // Current manual entry
  const currentEntry = manualEntries[activeEntryIndex] || manualEntries[0];
  const previewSlides = parseLyricsToSlides(currentEntry?.lyrics || '');

  // Valid manual entries count
  const validManualEntries = manualEntries.filter(
    (e) => e.title.trim() && e.lyrics.trim(),
  );

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setManualEntries([{ id: uuidv4(), title: '', lyrics: '' }]);
      setActiveEntryIndex(0);
      setError(null);
      setDuplicates({});
      setShowDragOverlay(false);
      dragCounterRef.current = 0;
      // Default to current session if there is one, otherwise library-only
      setSessionTarget(currentSessionId || 'library-only');
      setNewSessionName('');
    }
  }, [open, currentSessionId]);

  // Check for duplicate title with debounce
  useEffect(() => {
    const currentTitle = currentEntry?.title?.trim();
    const entryId = currentEntry?.id;

    if (!currentTitle || !entryId) {
      if (entryId && duplicates[entryId]) {
        setDuplicates((prev) => {
          const next = { ...prev };
          delete next[entryId];
          return next;
        });
      }
      return;
    }

    // Debounce the check
    const timeoutId = setTimeout(async () => {
      const electron = getElectron();
      if (!electron) return;

      setCheckingDuplicate(entryId);
      try {
        const result = await electron.library.findByTitle(currentTitle);
        if (result.success && result.data) {
          setDuplicates((prev) => ({
            ...prev,
            [entryId]: result.data,
          }));
        } else {
          setDuplicates((prev) => {
            const next = { ...prev };
            delete next[entryId];
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to check duplicate:', err);
      } finally {
        setCheckingDuplicate(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only check duplicates when title/id change
  }, [currentEntry?.title, currentEntry?.id]);

  // Add new manual entry
  const handleAddManualEntry = () => {
    const newEntry = { id: uuidv4(), title: '', lyrics: '' };
    setManualEntries([...manualEntries, newEntry]);
    setActiveEntryIndex(manualEntries.length);
  };

  // Remove manual entry
  const handleRemoveManualEntry = (index: number) => {
    if (manualEntries.length <= 1) return;
    const newEntries = manualEntries.filter((_, i) => i !== index);
    setManualEntries(newEntries);
    if (activeEntryIndex >= newEntries.length) {
      setActiveEntryIndex(newEntries.length - 1);
    } else if (activeEntryIndex > index) {
      setActiveEntryIndex(activeEntryIndex - 1);
    }
  };

  // Update manual entry
  const handleUpdateEntry = (
    index: number,
    field: 'title' | 'lyrics',
    value: string,
  ) => {
    const newEntries = [...manualEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setManualEntries(newEntries);
  };

  // Copy lyrics from existing song
  const handleCopyExistingLyrics = () => {
    if (!currentEntry) return;
    const existingSong = duplicates[currentEntry.id];
    if (!existingSong) return;

    const entryIndex = manualEntries.findIndex((e) => e.id === currentEntry.id);
    if (entryIndex === -1) return;

    const newEntries = [...manualEntries];
    newEntries[entryIndex] = {
      ...newEntries[entryIndex],
      lyrics: existingSong.lyrics,
    };
    setManualEntries(newEntries);
  };

  // Process image/PDF files with OCR
  const processFiles = useCallback(
    async (files: File[]) => {
      const ocrFiles = files.filter(isOcrFile);

      if (ocrFiles.length === 0) {
        setError(t('noImageFilesDetected'));
        return;
      }

      // Check file size limits
      const oversized = ocrFiles.filter((f) => f.size > MAX_OCR_FILE_SIZE);
      if (oversized.length > 0) {
        setError(
          `${oversized.map((f) => f.name).join(', ')}: ${t('fileTooLarge')}`,
        );
        return;
      }

      const electron = getElectron();
      if (!electron) {
        setError(t('electronNotAvailable'));
        return;
      }

      if (!hasApiKey) {
        setError(t('apiKeyMissing'));
        return;
      }

      setIsProcessing(true);
      setError(null);

      const hasPdfs = ocrFiles.some(isPdfFile);
      setProcessingMessage(
        hasPdfs ? t('processingFiles') : t('processingImages'),
      );
      setProcessingProgress({ current: 0, total: ocrFiles.length });

      let completedCount = 0;

      try {
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

        const newEntries: ManualSongEntry[] = [];

        for (const item of batchResult.data) {
          completedCount++;
          setProcessingProgress({
            current: Math.min(completedCount, ocrFiles.length),
            total: ocrFiles.length,
          });

          if (item.success && item.data) {
            // Check library for existing song
            const libraryResult = await electron.library.findByTitle(
              item.data.title,
            );
            const songData =
              libraryResult.success && libraryResult.data
                ? libraryResult.data
                : item.data;

            newEntries.push({
              id: uuidv4(),
              title: songData.title || t('untitledSong'),
              lyrics: songData.lyrics || '',
            });
          } else {
            setError(item.error || t('ocrError'));
          }
        }

        // Add new entries to manual entries
        if (newEntries.length > 0) {
          const currentIsEmpty =
            !manualEntries[activeEntryIndex]?.title.trim() &&
            !manualEntries[activeEntryIndex]?.lyrics.trim();

          if (currentIsEmpty && manualEntries.length === 1) {
            setManualEntries(newEntries);
            setActiveEntryIndex(0);
          } else {
            setManualEntries([...manualEntries, ...newEntries]);
            setActiveEntryIndex(manualEntries.length);
          }
        }
      } catch (err) {
        console.error('[AddSongDialog] Processing error:', err);
        setError(err instanceof Error ? err.message : t('ocrError'));
      } finally {
        setIsProcessing(false);
        setProcessingProgress({ current: 0, total: 0 });
        setProcessingMessage('');
      }
    },
    [t, hasApiKey, manualEntries, activeEntryIndex],
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

  // Handle paste event - works in any mode
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

  // Check if drag contains image or PDF files
  const hasOcrFiles = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      const items = e.dataTransfer.items;
      for (let i = 0; i < items.length; i++) {
        if (
          items[i].type.startsWith('image/') ||
          items[i].type === 'application/pdf'
        ) {
          return true;
        }
      }
      // If no MIME type detected but files are present, allow drop
      // (Windows may report empty type for PDFs — we'll check extensions on drop)
      if (items.length > 0) {
        return true;
      }
    }
    return false;
  };

  // Handle drag events for full-page overlay
  const handleDialogDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (hasOcrFiles(e)) {
      setShowDragOverlay(true);
    }
  };

  const handleDialogDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setShowDragOverlay(false);
    }
  };

  const handleDialogDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDialogDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDragOverlay(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    // Use processFiles directly - it will filter and show errors if no images
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Save all songs
  const handleSave = async () => {
    // Validate new session name if creating new session
    if (sessionTarget === 'new-session' && !newSessionName.trim()) {
      setError(t('sessionNameRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const songsToAdd = validManualEntries.map((e) => ({
        title: e.title.trim(),
        lyrics: e.lyrics.trim(),
      }));

      if (songsToAdd.length === 0) return;

      await onAddToLibrary(
        songsToAdd,
        sessionTarget,
        sessionTarget === 'new-session' ? newSessionName.trim() : undefined,
      );
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave =
    validManualEntries.length > 0 &&
    (sessionTarget !== 'new-session' || newSessionName.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl h-[85vh] bg-background border-border p-0 overflow-hidden gap-0"
        onInteractOutside={(e) => e.preventDefault()}
        onDragEnter={handleDialogDragEnter}
        onDragLeave={handleDialogDragLeave}
        onDragOver={handleDialogDragOver}
        onDrop={handleDialogDrop}
        onPaste={handlePaste}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Full-page drag overlay */}
        {showDragOverlay && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
            <div className="w-32 h-32 rounded-full bg-muted/50 flex items-center justify-center mb-6 animate-pulse">
              <Upload className="w-16 h-16 text-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t('dropImagesHere')}
            </h2>
            <p className="text-muted-foreground">{t('releaseToImport')}</p>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <DialogHeader className="px-6 py-4 border-b border-border/50 pr-12 shrink-0">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-foreground" />
            {t('addSongToLibrary')}
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

        {/* Error State */}
        {error && (
          <div className="px-6 py-3 border-b border-red-500/30 bg-red-500/10 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={() => setError(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Drag & Drop Hint */}
        {!isProcessing && (
          <div className="px-6 py-2 border-b border-border/30 bg-muted/20 flex items-center gap-2 shrink-0">
            <FileImage className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {hasApiKey === false ? (
                <span className="text-amber-500">
                  {t('apiKeyRequiredForOcr')}
                </span>
              ) : (
                t('dragImagesToImport')
              )}
            </p>
          </div>
        )}

        {/* Song Entry Form */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Song List + Editor */}
          <div className="flex-1 flex flex-col border-r border-border/50 min-w-0">
            {/* Song entries list */}
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <div className="flex items-center gap-2 pb-1">
                  {manualEntries.map((entry, index) => (
                    <button
                      key={entry.id}
                      onClick={() => setActiveEntryIndex(index)}
                      className={cn(
                        'group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0',
                        activeEntryIndex === index
                          ? 'bg-foreground text-background'
                          : 'bg-muted hover:bg-muted/80 text-foreground',
                      )}
                    >
                      <span className="w-4 h-4 flex items-center justify-center rounded-full bg-background/20 text-[10px]">
                        {index + 1}
                      </span>
                      <span className="max-w-[120px] truncate">
                        {entry.title || t('untitledSong')}
                      </span>
                      {manualEntries.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveManualEntry(index);
                          }}
                          className={cn(
                            'w-4 h-4 flex items-center justify-center rounded-full transition-colors',
                            activeEntryIndex === index
                              ? 'hover:bg-background/20'
                              : 'hover:bg-foreground/10',
                          )}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs shrink-0"
                onClick={handleAddManualEntry}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {t('addAnother')}
              </Button>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col p-4 min-h-0">
              <div className="space-y-1.5 mb-4">
                <Label
                  htmlFor="title"
                  className="text-xs text-muted-foreground"
                >
                  {t('songTitle')}
                </Label>
                <div className="relative">
                  <Input
                    id="title"
                    value={currentEntry?.title || ''}
                    onChange={(e) =>
                      handleUpdateEntry(
                        activeEntryIndex,
                        'title',
                        e.target.value,
                      )
                    }
                    placeholder={t('songTitlePlaceholder')}
                    className={cn(
                      'bg-muted/50 border-border text-foreground placeholder:text-muted-foreground',
                      duplicates[currentEntry?.id] &&
                        'border-amber-500/50 pr-8',
                    )}
                  />
                  {checkingDuplicate === currentEntry?.id && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Duplicate Song Warning */}
                {duplicates[currentEntry?.id] && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                    <div className="px-3 py-2 flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">
                          {t('existingSongFound')}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10"
                        onClick={handleCopyExistingLyrics}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        {t('useExistingLyrics')}
                      </Button>
                    </div>
                    <div className="px-3 py-2 max-h-24 overflow-y-auto">
                      <p className="text-[10px] text-muted-foreground whitespace-pre-line line-clamp-4 font-mono leading-relaxed">
                        {duplicates[currentEntry?.id]?.lyrics.substring(0, 200)}
                        {(duplicates[currentEntry?.id]?.lyrics?.length || 0) >
                          200 && '...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <Label
                  htmlFor="lyrics"
                  className="text-xs text-muted-foreground mb-1.5"
                >
                  {t('lyrics')}
                </Label>
                <Textarea
                  id="lyrics"
                  value={currentEntry?.lyrics || ''}
                  onChange={(e) =>
                    handleUpdateEntry(
                      activeEntryIndex,
                      'lyrics',
                      e.target.value,
                    )
                  }
                  placeholder={t('lyricsPlaceholder')}
                  className="flex-1 resize-none bg-muted/50 border-border text-foreground placeholder:text-muted-foreground font-mono text-sm leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  {t('lyricsHint')}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="w-80 flex flex-col bg-card/50 shrink-0">
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
                            key={lineIndex} // eslint-disable-line react/no-array-index-key -- lines have no stable ID
                            className="text-xs text-foreground leading-relaxed"
                          >
                            {line || (
                              <span className="text-muted-foreground">—</span>
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between gap-4">
          {/* Session Selection */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              {t('addTo')}:
            </Label>
            <Select
              value={sessionTarget}
              onValueChange={(value) =>
                setSessionTarget(value as SessionTarget)
              }
              disabled={isLoadingSessions}
            >
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue placeholder={t('selectDestination')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="library-only">
                  <span className="flex items-center gap-2">
                    <Library className="w-3.5 h-3.5" />
                    {t('libraryOnly')}
                  </span>
                </SelectItem>
                <SelectItem value="new-session">
                  <span className="flex items-center gap-2">
                    <FolderPlus className="w-3.5 h-3.5" />
                    {t('createNewSession')}
                  </span>
                </SelectItem>
                {sessions.length > 0 && <SelectSeparator />}
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    <span className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[140px]">
                        {session.name}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* New session name input */}
            {sessionTarget === 'new-session' && (
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder={t('newSessionName')}
                className="h-8 text-xs w-40"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              {t('cancel')}
            </Button>

            <Button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Library className="w-4 h-4 mr-1" />
              )}
              {t('addToLibrary')} ({validManualEntries.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
