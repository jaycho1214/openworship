/* eslint-disable no-console */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Music2,
  FolderOpen,
  Plus,
  ArrowRight,
  X,
  Command,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { useSession, useSetlist } from '../context';
import { cn } from '../../lib/utils';
import type { LibrarySong, DbSession } from '../../../shared/types';

// Helper to safely access electron API
const getElectron = () => (window as unknown as { electron: any }).electron;

interface SearchResult {
  type: 'song' | 'session';
  id: string;
  title: string;
  subtitle?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSession?: (sessionId: string) => void;
}

export default function GlobalSearch({
  open,
  onOpenChange,
  onSelectSession,
}: GlobalSearchProps) {
  const { t } = useTranslation();
  const { addItem } = useSetlist();
  const { currentSessionId } = useSession();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const electron = getElectron();

    try {
      const searchResults: SearchResult[] = [];

      // Search songs
      const songsResult = await electron.library.search(searchQuery);
      if (songsResult.success && songsResult.data) {
        const songs = songsResult.data.slice(0, 5).map((song: LibrarySong) => ({
          type: 'song' as const,
          id: song.id,
          title: song.title,
          subtitle: song.categories || undefined,
        }));
        searchResults.push(...songs);
      }

      // Search sessions
      const sessionsResult = await electron.session.getAll();
      if (sessionsResult.success && sessionsResult.data) {
        const filteredSessions = sessionsResult.data
          .filter((session: DbSession) =>
            session.name.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .slice(0, 3)
          .map((session: DbSession) => ({
            type: 'session' as const,
            id: session.id,
            title: session.name,
            subtitle: new Date(session.updatedAt).toLocaleDateString(),
          }));
        searchResults.push(...filteredSessions);
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle result selection
  const handleSelect = useCallback(
    async (result: SearchResult) => {
      if (result.type === 'song') {
        // Add song to current setlist if there is one
        if (currentSessionId) {
          await addItem({ type: 'song', songId: result.id });
        }
      } else if (result.type === 'session') {
        onSelectSession?.(result.id);
      }
      onOpenChange(false);
    },
    [currentSessionId, addItem, onSelectSession, onOpenChange],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          onOpenChange(false);
          break;
        default:
          break;
      }
    },
    [results, selectedIndex, onOpenChange, handleSelect],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{t('globalSearch')}</DialogTitle>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('searchPlaceholder')}
            className="h-12 border-0 shadow-none focus-visible:ring-0 px-0 text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query && !isLoading && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {t('noResults')}
            </div>
          )}

          {results.length === 0 && !query && (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm mb-2">
                {t('searchHint')}
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                  ↑↓
                </kbd>
                <span>{t('toNavigate')}</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono ml-2">
                  ↵
                </kbd>
                <span>{t('toSelect')}</span>
              </div>
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50',
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  result.type === 'song'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-amber-500/10 text-amber-500',
                )}
              >
                {result.type === 'song' ? (
                  <Music2 className="w-4 h-4" />
                ) : (
                  <FolderOpen className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{result.title}</p>
                {result.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">
                    {result.subtitle}
                  </p>
                )}
              </div>

              {/* Action indicator */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                {result.type === 'song' && currentSessionId ? (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>{t('addToSetlist')}</span>
                  </>
                ) : result.type === 'session' ? (
                  <>
                    <ArrowRight className="w-3 h-3" />
                    <span>{t('open')}</span>
                  </>
                ) : null}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Music2 className="w-3 h-3" />
              {t('songs')}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {t('sessions')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
