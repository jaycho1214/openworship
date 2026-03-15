/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { getElectron } from '@/shared/hooks/useElectron';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { cn } from '../../lib/utils';

interface Session {
  id: string;
  name: string;
}

interface SessionBreadcrumbProps {
  sessionName: string;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onBackToSessions: () => void;
}

export default function SessionBreadcrumb({
  sessionName,
  currentSessionId,
  onSelectSession,
  onBackToSessions,
}: SessionBreadcrumbProps) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);

  // Load sessions for the dropdown
  const loadSessions = useCallback(async () => {
    const electron = getElectron();
    if (!electron) return;

    try {
      const result = await electron.session.getAll();
      if (result.success && result.data) {
        setSessions(result.data);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <div className="h-10 px-4 border-b border-border bg-card/30 flex items-center gap-1 flex-shrink-0">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onBackToSessions}
        data-testid="breadcrumb-sessions"
      >
        {t('sessions')}
      </Button>

      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-semibold text-foreground hover:bg-muted gap-1"
            data-testid="breadcrumb-current"
          >
            {sessionName}
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {sessions.map((session) => (
            <DropdownMenuItem
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                'gap-2 cursor-pointer',
                session.id === currentSessionId &&
                  'bg-active text-active-foreground',
              )}
            >
              <span className="text-xs truncate">{session.name}</span>
            </DropdownMenuItem>
          ))}
          {sessions.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onClick={onBackToSessions}
            className="gap-2 cursor-pointer text-muted-foreground"
          >
            <span className="text-xs">{t('allSessions')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
