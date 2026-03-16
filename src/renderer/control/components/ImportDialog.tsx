/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Music,
  ListMusic,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getElectron } from '@/shared/hooks/useElectron';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { cn } from '../../lib/utils';
import type {
  ImportPreview,
  ImportOptions,
  ImportResult,
} from '../../../shared/types';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when import completes successfully */
  onImportComplete?: () => void;
  /** Optional pre-loaded preview data (for file association) */
  initialPreview?: ImportPreview;
}

type ConflictResolution = 'skip' | 'overwrite' | 'duplicate';

export default function ImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  initialPreview,
}: ImportDialogProps) {
  const { t } = useTranslation();

  // State
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Selection state
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
    new Set(),
  );
  const [conflictResolution, setConflictResolution] =
    useState<ConflictResolution>('skip');

  // Load initial preview or open file dialog
  useEffect(() => {
    if (!open) return;

    // Reset state
    setError(null);
    setResult(null);

    if (initialPreview) {
      // Use pre-loaded preview
      setPreview(initialPreview);
      // Select all items by default
      setSelectedSongIds(new Set(initialPreview.songs.map((s) => s.song.id)));
      setSelectedSessionIds(
        new Set(initialPreview.sessions.map((s) => s.session.id)),
      );
    } else {
      // Open file dialog
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only load preview when dialog opens
  }, [open, initialPreview]);

  const loadPreview = async () => {
    const electron = getElectron();
    if (!electron) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await electron.import.preview();
      if (response.canceled) {
        onOpenChange(false);
        return;
      }
      if (!response.success || !response.data) {
        setError(response.error || t('fileImportFailed'));
        return;
      }

      setPreview(response.data);
      // Select all items by default
      setSelectedSongIds(
        new Set(response.data.songs.map((s: any) => s.song.id)),
      );
      setSelectedSessionIds(
        new Set(response.data.sessions.map((s: any) => s.session.id)),
      );
    } catch (err) {
      console.error('[ImportDialog] Error loading preview:', err);
      setError(err instanceof Error ? err.message : t('fileImportFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle song selection
  const toggleSong = useCallback((songId: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }, []);

  // Toggle session selection
  const toggleSession = useCallback((sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  // Select/deselect all songs
  const toggleAllSongs = useCallback(() => {
    if (!preview) return;
    if (selectedSongIds.size === preview.songs.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(preview.songs.map((s) => s.song.id)));
    }
  }, [preview, selectedSongIds.size]);

  // Select/deselect all sessions
  const toggleAllSessions = useCallback(() => {
    if (!preview) return;
    if (selectedSessionIds.size === preview.sessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(preview.sessions.map((s) => s.session.id)));
    }
  }, [preview, selectedSessionIds.size]);

  // Execute import
  const handleImport = async () => {
    if (!preview) return;

    const electron = getElectron();
    if (!electron) return;

    setIsImporting(true);
    setError(null);

    try {
      const options: ImportOptions = {
        selectedSongIds: Array.from(selectedSongIds),
        selectedSessionIds: Array.from(selectedSessionIds),
        conflictResolution,
      };

      const response = await electron.import.execute(preview, options);
      if (!response.success) {
        setError(response.error || t('fileImportFailed'));
        return;
      }

      setResult(response.data ?? null);
      onImportComplete?.();
    } catch (err) {
      console.error('[ImportDialog] Error executing import:', err);
      setError(err instanceof Error ? err.message : t('fileImportFailed'));
    } finally {
      setIsImporting(false);
    }
  };

  // Close dialog
  const handleClose = () => {
    setPreview(null);
    setSelectedSongIds(new Set());
    setSelectedSessionIds(new Set());
    setConflictResolution('skip');
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  const canImport = selectedSongIds.size > 0 || selectedSessionIds.size > 0;

  // Count items with conflicts
  const conflictingSongs = preview?.songs.filter((s) => s.exists).length || 0;
  const conflictingSessions =
    preview?.sessions.filter((s) => s.exists).length || 0;
  const hasConflicts = conflictingSongs > 0 || conflictingSessions > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        data-testid="import-dialog"
        className="max-w-2xl max-h-[85vh] bg-background border-border p-0 overflow-hidden gap-0 flex flex-col"
      >
        <DialogHeader className="px-6 py-4 border-b border-border/50 pr-12 shrink-0">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Download className="w-4 h-4 text-foreground" />
            {result ? t('importSuccess') : t('importPreview')}
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="px-6 py-4 border-b border-red-500/30 bg-red-500/10 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-500 flex-1">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={() => setError(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div
            data-testid="import-success"
            className="flex-1 flex flex-col items-center justify-center py-12 px-6"
          >
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('importSuccess')}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {t('importedSuccessfully', {
                songs: result.importedSongs,
                sessions: result.importedSessions,
              })}
            </p>
            {(result.skippedSongs > 0 || result.skippedSessions > 0) && (
              <p className="text-xs text-muted-foreground text-center">
                {t('skippedItems', {
                  songs: result.skippedSongs,
                  sessions: result.skippedSessions,
                })}
              </p>
            )}
          </div>
        )}

        {/* Preview Content */}
        {preview && !result && !isLoading && (
          <>
            {/* File Info */}
            <div className="px-6 py-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {preview.file.type === 'library'
                    ? t('exportLibrary')
                    : preview.file.type === 'session'
                      ? t('exportSession')
                      : t('exportSong')}
                </span>
                <span>v{preview.file.appVersion}</span>
              </div>
            </div>

            {/* Conflict Resolution */}
            {hasConflicts && (
              <div className="px-6 py-3 border-b border-border/50 bg-amber-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {t('conflictResolution')}
                    </span>
                  </div>
                  <Select
                    value={conflictResolution}
                    onValueChange={(v) =>
                      setConflictResolution(v as ConflictResolution)
                    }
                  >
                    <SelectTrigger
                      className="w-40 h-7 text-xs"
                      data-testid="conflict-resolution-trigger"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">{t('skipExisting')}</SelectItem>
                      <SelectItem value="overwrite">
                        {t('overwriteExisting')}
                      </SelectItem>
                      <SelectItem value="duplicate">
                        {t('duplicateAsNew')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Selection Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Songs Section */}
                {preview.songs.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-foreground">
                          {t('songs')}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {t('songsToImportCount', {
                            count: preview.songs.length,
                          })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={toggleAllSongs}
                      >
                        {selectedSongIds.size === preview.songs.length
                          ? t('deselectAll')
                          : t('selectAll')}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {preview.songs.map(({ song, exists }) => (
                        <div
                          key={song.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                            selectedSongIds.has(song.id)
                              ? 'border-active-border-subtle bg-active'
                              : 'border-border/50 bg-card/50',
                          )}
                        >
                          <Checkbox
                            id={`song-${song.id}`}
                            checked={selectedSongIds.has(song.id)}
                            onCheckedChange={() => toggleSong(song.id)}
                          />
                          <Label
                            htmlFor={`song-${song.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {song.title}
                            </span>
                            {exists && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                {t('existingSongFound')}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sessions Section */}
                {preview.sessions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ListMusic className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-foreground">
                          {t('sessions')}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {t('sessionsToImportCount', {
                            count: preview.sessions.length,
                          })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={toggleAllSessions}
                      >
                        {selectedSessionIds.size === preview.sessions.length
                          ? t('deselectAll')
                          : t('selectAll')}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {preview.sessions.map(
                        ({ session, exists, missingSongs }) => (
                          <div
                            key={session.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                              selectedSessionIds.has(session.id)
                                ? 'border-foreground/30 bg-muted/50'
                                : 'border-border/50 bg-card/50',
                            )}
                          >
                            <Checkbox
                              id={`session-${session.id}`}
                              checked={selectedSessionIds.has(session.id)}
                              onCheckedChange={() => toggleSession(session.id)}
                            />
                            <Label
                              htmlFor={`session-${session.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {session.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({session.songIds.length} {t('songs')})
                                </span>
                              </div>
                              {exists && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                  {t('existingSongFound')}
                                </span>
                              )}
                              {missingSongs.length > 0 && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                                  {t('missingSongsWillBeImported', {
                                    count: missingSongs.length,
                                  })}
                                </p>
                              )}
                            </Label>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* No items */}
                {preview.songs.length === 0 &&
                  preview.sessions.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        {t('noItemsToImport')}
                      </p>
                    </div>
                  )}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              {preview && !result && canImport && (
                <>
                  {selectedSongIds.size} {t('songs')}, {selectedSessionIds.size}{' '}
                  {t('sessions')} {t('selectedCount')}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground"
              >
                {result ? t('close') : t('cancel')}
              </Button>
              {!result && (
                <Button
                  onClick={handleImport}
                  disabled={!canImport || isImporting || isLoading}
                  className="bg-foreground text-background hover:bg-foreground/90 font-semibold"
                  data-testid="import-execute-btn"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  {t('importNow')}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
