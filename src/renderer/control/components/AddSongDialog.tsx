/* eslint-disable no-console */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
  FileImage,
  Library,
  BookOpen,
  Link2,
  Unlink,
  Upload,
  FolderPlus,
  FolderOpen,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getElectron } from '@/shared/hooks/useElectron';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
import {
  isOcrFile,
  isPdfFile,
  readFileAsBase64,
  getFileMimeType,
  MAX_OCR_FILE_SIZE,
} from '../../shared/utils/fileHelpers';
import { normalizeLineEndings } from '../../shared/utils/lyricsParser';
import { cn } from '../../lib/utils';

// Type for manual entry item
interface ManualSongEntry {
  id: string;
  title: string;
  lyrics: string;
  linkedSongId?: string; // ID of existing library song this entry is linked to
}

// Type for existing song found by search
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
    songs: { title: string; lyrics: string; existingSongId?: string }[],
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
    { id: crypto.randomUUID(), title: '', lyrics: '' },
  ]);
  const [activeEntryIndex, setActiveEntryIndex] = useState(0);

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState<Record<string, ExistingSong[]>>(
    {},
  );
  const [checkingDuplicate, setCheckingDuplicate] = useState<string | null>(
    null,
  );
  const [expandedDuplicate, setExpandedDuplicate] = useState<string | null>(
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

  // Card-based lyrics editing state
  const [slideCards, setSlideCards] = useState<string[]>(['']);
  const cardRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

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
  // Valid manual entries count (linked entries are always valid)
  const validManualEntries = manualEntries.filter(
    (e) => e.linkedSongId || (e.title.trim() && e.lyrics.trim()),
  );

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setManualEntries([{ id: crypto.randomUUID(), title: '', lyrics: '' }]);
      setActiveEntryIndex(0);
      setError(null);
      setDuplicates({});
      setExpandedDuplicate(null);
      setShowDragOverlay(false);
      dragCounterRef.current = 0;
      // Default to current session if there is one, otherwise library-only
      setSessionTarget(currentSessionId || 'library-only');
      setNewSessionName('');
    }
  }, [open, currentSessionId]);

  // Check for duplicates by title and lyrics with debounce
  useEffect(() => {
    const currentTitle = currentEntry?.title?.trim();
    const currentLyrics = currentEntry?.lyrics?.trim();
    const entryId = currentEntry?.id;

    if ((!currentTitle && !currentLyrics) || !entryId) {
      if (entryId && duplicates[entryId]) {
        setDuplicates((prev) => {
          const next = { ...prev };
          delete next[entryId];
          return next;
        });
      }
      return;
    }

    // Use title for search, or first meaningful line of lyrics
    const searchQuery =
      currentTitle ||
      (currentLyrics ? currentLyrics.split('\n')[0].substring(0, 50) : '');
    if (!searchQuery) return;

    // Debounce the check
    const timeoutId = setTimeout(async () => {
      const electron = getElectron();
      if (!electron) return;

      setCheckingDuplicate(entryId);
      try {
        const result = await electron.library.search(searchQuery);
        if (result.success && result.data && result.data.length > 0) {
          setDuplicates((prev) => ({
            ...prev,
            [entryId]: result.data!.slice(0, 5), // Limit to 5 candidates
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only check duplicates when title/lyrics/id change
  }, [currentEntry?.title, currentEntry?.lyrics, currentEntry?.id]);

  // Add new manual entry
  const handleAddManualEntry = () => {
    const newEntry = { id: crypto.randomUUID(), title: '', lyrics: '' };
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

  // Update manual entry (uses functional update to avoid stale closures)
  const handleUpdateEntry = useCallback(
    (index: number, field: 'title' | 'lyrics', value: string) => {
      setManualEntries((prev) => {
        const newEntries = [...prev];
        newEntries[index] = { ...newEntries[index], [field]: value };
        return newEntries;
      });
    },
    [],
  );

  // Link entry to an existing library song (instead of copying)
  const handleLinkToSong = (song: ExistingSong) => {
    if (!currentEntry) return;

    const entryIndex = manualEntries.findIndex((e) => e.id === currentEntry.id);
    if (entryIndex === -1) return;

    const newEntries = [...manualEntries];
    newEntries[entryIndex] = {
      ...newEntries[entryIndex],
      title: song.title,
      lyrics: song.lyrics,
      linkedSongId: song.id,
    };
    setManualEntries(newEntries);
  };

  // Unlink entry from existing library song
  const handleUnlink = () => {
    if (!currentEntry) return;

    const entryIndex = manualEntries.findIndex((e) => e.id === currentEntry.id);
    if (entryIndex === -1) return;

    const newEntries = [...manualEntries];
    newEntries[entryIndex] = {
      ...newEntries[entryIndex],
      linkedSongId: undefined,
    };
    setManualEntries(newEntries);
  };

  // Sync slideCards from current entry's lyrics when switching entries
  const currentEntryId = currentEntry?.id;
  const currentEntryLyrics = currentEntry?.lyrics;
  useEffect(() => {
    const lyrics = currentEntryLyrics || '';
    if (lyrics.trim()) {
      const cards = lyrics.split(/\n\n+/).filter((c) => c.trim());
      setSlideCards(cards.length > 0 ? cards : ['']);
    } else {
      setSlideCards(['']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when switching entries
  }, [activeEntryIndex, currentEntryId]);

  // Update lyrics from card changes
  const updateLyricsFromCards = useCallback(
    (cards: string[]) => {
      setSlideCards(cards);
      const lyrics = cards
        .map((c) => c.trim())
        .filter(Boolean)
        .join('\n\n');
      handleUpdateEntry(activeEntryIndex, 'lyrics', lyrics);
    },
    [activeEntryIndex], // eslint-disable-line react-hooks/exhaustive-deps -- handleUpdateEntry is stable
  );

  // Update a single card's content
  const handleCardChange = useCallback(
    (index: number, value: string) => {
      const newCards = [...slideCards];
      newCards[index] = value;
      updateLyricsFromCards(newCards);
    },
    [slideCards, updateLyricsFromCards],
  );

  // Handle keyboard shortcuts in cards
  const handleCardKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;

      // Tab to split card at cursor
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const { selectionStart } = textarea;
        const before = slideCards[index].substring(0, selectionStart);
        const after = slideCards[index].substring(selectionStart);

        const newCards = [...slideCards];
        newCards[index] = before.trimEnd();
        newCards.splice(index + 1, 0, after.trimStart());
        updateLyricsFromCards(newCards);

        // Focus the new card
        requestAnimationFrame(() => {
          const newCard = cardRefs.current[index + 1];
          newCard?.focus();
          newCard?.setSelectionRange(0, 0);
        });
      }

      // Shift+Tab to merge with previous card
      if (e.key === 'Tab' && e.shiftKey && index > 0) {
        e.preventDefault();
        const prevContent = slideCards[index - 1];
        const cursorPos = prevContent.length;

        const newCards = [...slideCards];
        newCards[index - 1] =
          prevContent + (slideCards[index] ? `\n${slideCards[index]}` : '');
        newCards.splice(index, 1);
        updateLyricsFromCards(newCards);

        requestAnimationFrame(() => {
          const prev = cardRefs.current[index - 1];
          prev?.focus();
          prev?.setSelectionRange(cursorPos, cursorPos);
        });
      }

      // Backspace at beginning of card to merge with previous
      if (
        e.key === 'Backspace' &&
        textarea.selectionStart === 0 &&
        textarea.selectionEnd === 0 &&
        index > 0
      ) {
        e.preventDefault();
        const prevContent = slideCards[index - 1];
        const cursorPos = prevContent.length;

        const newCards = [...slideCards];
        newCards[index - 1] =
          prevContent + (slideCards[index] ? `\n${slideCards[index]}` : '');
        newCards.splice(index, 1);
        updateLyricsFromCards(newCards);

        requestAnimationFrame(() => {
          const prev = cardRefs.current[index - 1];
          prev?.focus();
          prev?.setSelectionRange(cursorPos, cursorPos);
        });
      }
    },
    [slideCards, updateLyricsFromCards],
  );

  // Handle paste - auto-split on blank lines
  const handleCardPaste = useCallback(
    (index: number, e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      // Check for image paste first (handled by dialog-level paste handler)
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) return; // Let dialog handler deal with images
        }
      }

      const text = e.clipboardData.getData('text');
      // Normalize CRLF to LF for consistent blank-line detection
      const normalizedText = normalizeLineEndings(text);
      if (!normalizedText.includes('\n\n')) return; // No blank lines, let default paste handle it

      e.preventDefault();
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;

      // Split pasted text by blank lines
      const pastedCards = normalizedText
        .split(/\n\n+/)
        .map((c) => c.trim())
        .filter(Boolean);
      if (pastedCards.length <= 1) {
        // Single segment, insert normally
        document.execCommand('insertText', false, text);
        return;
      }

      // Merge with existing content around cursor
      const before = slideCards[index].substring(0, selectionStart);
      const after = slideCards[index].substring(selectionEnd);

      pastedCards[0] = (before + pastedCards[0]).trim();
      pastedCards[pastedCards.length - 1] = (
        pastedCards[pastedCards.length - 1] + after
      ).trim();

      const newCards = [...slideCards];
      newCards.splice(index, 1, ...pastedCards);
      updateLyricsFromCards(newCards);

      // Focus last pasted card
      const lastIndex = index + pastedCards.length - 1;
      requestAnimationFrame(() => {
        cardRefs.current[lastIndex]?.focus();
      });
    },
    [slideCards, updateLyricsFromCards],
  );

  // Remove a card
  const handleRemoveCard = useCallback(
    (index: number) => {
      if (slideCards.length <= 1) return;
      const newCards = slideCards.filter((_, i) => i !== index);
      updateLyricsFromCards(newCards);
      const focusIndex = Math.min(index, newCards.length - 1);
      requestAnimationFrame(() => {
        cardRefs.current[focusIndex]?.focus();
      });
    },
    [slideCards, updateLyricsFromCards],
  );

  // Count non-empty cards for display
  const filledCardCount = useMemo(
    () => slideCards.filter((c) => c.trim()).length,
    [slideCards],
  );

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
            newEntries.push({
              id: crypto.randomUUID(),
              title: item.data.title || t('untitledSong'),
              lyrics: item.data.lyrics || '',
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
        existingSongId: e.linkedSongId,
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
        className="max-w-2xl h-[85vh] bg-background border-border p-0 overflow-hidden gap-0"
        data-testid="add-song-dialog"
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
          {/* Song List + Editor */}
          <div className="flex-1 flex flex-col min-w-0">
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
                      {entry.linkedSongId && (
                        <Link2 className="w-3 h-3 shrink-0 opacity-70" />
                      )}
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
                {/* Linked badge */}
                {currentEntry?.linkedSongId && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
                    <Link2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 flex-1">
                      {t('linkedToExistingSong')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={handleUnlink}
                    >
                      <Unlink className="w-3 h-3 mr-1" />
                      {t('unlink')}
                    </Button>
                  </div>
                )}

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
                    readOnly={!!currentEntry?.linkedSongId}
                    placeholder={t('songTitlePlaceholder')}
                    data-testid="add-song-title"
                    className={cn(
                      'bg-muted/50 border-border text-foreground caret-current placeholder:text-muted-foreground',
                      duplicates[currentEntry?.id] &&
                        !currentEntry?.linkedSongId &&
                        'border-amber-500/50 pr-8',
                      currentEntry?.linkedSongId &&
                        'opacity-60 cursor-not-allowed',
                    )}
                  />
                  {checkingDuplicate === currentEntry?.id && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Similar Songs Found — hide when linked */}
                {!currentEntry?.linkedSongId &&
                  duplicates[currentEntry?.id]?.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                      <div className="px-3 py-2 flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                          {t('existingSongFound')} (
                          {duplicates[currentEntry?.id].length})
                        </span>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {duplicates[currentEntry?.id].map((song) => (
                          <div
                            key={song.id}
                            className="border-b border-amber-500/10 last:border-b-0"
                          >
                            <button
                              type="button"
                              className="w-full px-3 py-2 flex items-center justify-between hover:bg-amber-500/5 transition-colors text-left"
                              onClick={() =>
                                setExpandedDuplicate(
                                  expandedDuplicate === song.id
                                    ? null
                                    : song.id,
                                )
                              }
                            >
                              <span className="text-xs font-medium text-foreground truncate flex-1 mr-2">
                                {song.title}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLinkToSong(song);
                                }}
                              >
                                <Link2 className="w-3 h-3 mr-1" />
                                {t('useThisSong')}
                              </Button>
                            </button>
                            {expandedDuplicate === song.id && (
                              <div className="px-3 pb-2">
                                <p className="text-[10px] text-muted-foreground whitespace-pre-line font-mono leading-relaxed">
                                  {song.lyrics}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t('lyrics')}{' '}
                    {filledCardCount > 0 && (
                      <span className="text-muted-foreground/60">
                        ({filledCardCount} {t('slides')})
                      </span>
                    )}
                  </Label>
                  {!currentEntry?.linkedSongId && (
                    <p className="text-[10px] text-muted-foreground">
                      {t('slideCardHint')}
                    </p>
                  )}
                </div>
                {currentEntry?.linkedSongId ? (
                  /* Read-only lyrics preview for linked entries */
                  <ScrollArea className="flex-1">
                    <pre className="p-3 text-sm font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap rounded-md border border-border/30 bg-muted/10 opacity-60">
                      {currentEntry.lyrics}
                    </pre>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="space-y-1.5 p-1 pr-2 pb-2">
                      {slideCards.map((card, index) => (
                        <div
                          key={index} // eslint-disable-line react/no-array-index-key -- positional cards
                          className="group relative flex items-start gap-1.5"
                        >
                          <span className="text-[10px] font-mono font-medium text-muted-foreground/50 w-5 text-right pt-2 shrink-0 select-none">
                            {index + 1}
                          </span>
                          <div className="flex-1 relative">
                            <textarea
                              ref={(el) => {
                                cardRefs.current[index] = el;
                              }}
                              value={card}
                              onChange={(e) =>
                                handleCardChange(index, e.target.value)
                              }
                              onKeyDown={(e) => handleCardKeyDown(index, e)}
                              onPaste={(e) => handleCardPaste(index, e)}
                              rows={Math.max(1, card.split('\n').length || 1)}
                              className={cn(
                                'w-full resize-none rounded-md border bg-muted/20 px-3 py-1.5 text-sm font-mono leading-relaxed text-foreground caret-current placeholder:text-muted-foreground/40',
                                'focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring focus:bg-muted/40',
                                'border-border/30 hover:border-border/60 transition-colors',
                              )}
                              placeholder={
                                index === 0 ? t('lyricsPlaceholder') : ''
                              }
                            />
                          </div>
                          {slideCards.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCard(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity pt-1.5 px-0.5 shrink-0"
                              tabIndex={-1}
                            >
                              <X className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 flex flex-col gap-3 shrink-0">
          {/* Session Selection */}
          <div className="flex items-center gap-2">
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
              <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
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
            {sessionTarget === 'new-session' && (
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder={t('newSessionName')}
                className="h-8 text-xs flex-1 min-w-0 text-foreground caret-current"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold"
              data-testid="add-song-submit"
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
