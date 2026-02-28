/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Loader2,
  FolderOpen,
  Pencil,
  Trash2,
  Check,
  X,
  ListMusic,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
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

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

// Types matching database
interface DbSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionListProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: (name: string) => Promise<DbSession | null>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  onRenameSession: (sessionId: string, newName: string) => Promise<boolean>;
  className?: string;
}

export default function SessionList({
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  className,
}: SessionListProps) {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Load sessions
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { electron } = window as any;
      const result = await electron.session.getAll();
      if (result.success && result.data) {
        setSessions(result.data);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Create new session
  const handleCreateSession = async () => {
    const name = newSessionName.trim() || t('newSession');
    const session = await onCreateSession(name);
    if (session) {
      setNewSessionName('');
      setIsCreating(false);
      loadSessions();
      onSelectSession(session.id);
    }
  };

  // Delete session with confirmation
  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    const deleted = await onDeleteSession(sessionToDelete);
    if (deleted) {
      loadSessions();
    }
    setSessionToDelete(null);
  };

  // Start renaming
  const handleStartRename = (session: DbSession) => {
    setEditingId(session.id);
    setEditingName(session.name);
  };

  // Save rename
  const handleSaveRename = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    const success = await onRenameSession(editingId, editingName.trim());
    if (success) {
      loadSessions();
    }
    setEditingId(null);
  };

  // Cancel rename
  const handleCancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Export session
  const handleExportSession = async (sessionId: string) => {
    const electron = getElectron();
    if (!electron) return;

    try {
      const result = await electron.export.session(sessionId);
      if (result.canceled) return;
      if (result.success) {
        toast.success(t('exportSuccess'));
      } else {
        toast.error(result.error || t('exportFailed'));
      }
    } catch (err) {
      console.error('[SessionList] Export error:', err);
      toast.error(t('exportFailed'));
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - standardized h-12 */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t('sessions')}
          </h2>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {sessions.length}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs font-semibold text-foreground hover:text-foreground hover:bg-muted border-border"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          {t('new')}
        </Button>
      </div>

      {/* New session input */}
      {isCreating && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Input
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder={t('sessionNamePlaceholder')}
              className="h-8 text-xs flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSession();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewSessionName('');
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-green-500 hover:text-green-400"
              onClick={handleCreateSession}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setIsCreating(false);
                setNewSessionName('');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Session List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <FolderOpen className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center mb-4 font-medium">
                {t('noSessions')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-medium border-border bg-muted text-foreground hover:text-white hover:bg-accent"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t('createFirstSession')}
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <ContextMenu key={session.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        'group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer',
                        'transition-all duration-150',
                        currentSessionId === session.id
                          ? 'bg-active border-2 border-active-border-subtle shadow-elevated'
                          : 'hover:bg-muted border-2 border-transparent hover:border-border',
                      )}
                      onClick={() => onSelectSession(session.id)}
                    >
                      <FolderOpen
                        className={cn(
                          'w-4 h-4 flex-shrink-0',
                          currentSessionId === session.id
                            ? 'text-active-foreground'
                            : 'text-muted-foreground',
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        {editingId === session.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-6 text-xs py-0"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename();
                                if (e.key === 'Escape') handleCancelRename();
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveRename();
                              }}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRename();
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p
                              className={cn(
                                'text-sm truncate',
                                currentSessionId === session.id
                                  ? 'text-active-foreground font-semibold'
                                  : 'text-foreground font-medium',
                              )}
                            >
                              {session.name}
                            </p>
                            <p
                              className={cn(
                                'text-[10px] mt-0.5 font-medium',
                                currentSessionId === session.id
                                  ? 'text-active-foreground-secondary'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {formatDate(session.updatedAt)}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Action buttons - show on hover */}
                      {editingId !== session.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(session);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-300 hover:bg-red-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(session.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleStartRename(session)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      {t('rename')}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleExportSession(session.id)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t('exportSession')}
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="text-red-500 focus:text-red-400"
                      onClick={() => setSessionToDelete(session.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('delete')}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={sessionToDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSessionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteSessionDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
