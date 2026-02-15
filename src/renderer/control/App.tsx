import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppProviders, useSession, useUndo, useMedia } from './context';
import { ErrorBoundary } from './components/ErrorBoundary';
import Header from './components/Header';
import SessionList from './components/SessionList';
import LivePreview from './components/LivePreview';
import UnifiedNavigator from './components/UnifiedNavigator';
import ControlPanel from './components/ControlPanel';
import LibrarySidebar from './components/LibrarySidebar';
import SettingsDialog from './components/settings/SettingsDialog';
import ImportDialog from './components/ImportDialog';
import SessionBreadcrumb from './components/SessionBreadcrumb';
import GlobalSearch from './components/GlobalSearch';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { cn } from '../lib/utils';
import type { ImportPreview } from '../../shared/types';

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

// Page-based navigation type
type NavigationPage = 'sessions' | 'songs';
type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'ko';

function AppContent() {
  const { t, i18n } = useTranslation();
  useKeyboardShortcuts();
  const {
    currentSessionId,
    createSession,
    loadSession,
    deleteSession,
    renameSession,
  } = useSession();
  const { lastAction } = useUndo();
  const {
    fontFamily,
    setFontFamily,
    detectedFonts,
    fontsLoading,
    loadFonts,
    embeddedVideos,
    loadVideos,
  } = useMedia();

  // Page-based navigation state
  const [currentPage, setCurrentPage] = useState<NavigationPage>('sessions');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [currentSessionName, setCurrentSessionName] = useState<string>('');

  // Settings state (lifted from Header)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>('ko');
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // File association state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null,
  );

  // Global search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Load settings from electron-store on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electron.settings.getAll();
        setTheme(settings.theme);
        setLanguage(settings.language);
        if (settings.language !== i18n.language) {
          i18n.changeLanguage(settings.language);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsSettingsLoading(false);
      }
    };
    loadSettings();
  }, [i18n]);

  // Apply theme
  useEffect(() => {
    if (isSettingsLoading) return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }, [theme, isSettingsLoading]);

  // Handle Cmd+K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux) - always works
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update document title based on current language
  useEffect(() => {
    document.title = t('windowTitleControl');
  }, [t]);

  // Handle file association - when user opens .oworship file
  useEffect(() => {
    const electron = getElectron();
    if (!electron?.onFileOpen) return;

    const unsubscribe = electron.onFileOpen(async (filePath: string) => {
      console.log('[App] File opened:', filePath);
      try {
        const result = await electron.import.previewPath(filePath);
        if (result.success && result.data) {
          setImportPreview(result.data);
          setImportDialogOpen(true);
        } else {
          console.error('[App] Failed to preview file:', result.error);
        }
      } catch (err) {
        console.error('[App] Error handling file open:', err);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Handle session selection - navigate to songs page
  const handleSelectSession = async (sessionId: string) => {
    const session = await loadSession(sessionId);
    if (session) {
      setCurrentSessionName(session.name);
    }
    setCurrentPage('songs');
  };

  // Handle back to sessions
  const handleBackToSessions = () => {
    setCurrentPage('sessions');
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Custom font import for Korean text */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');

        body {
          font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        }
      `}</style>

      {/* Header */}
      <Header />

      {/* Session Breadcrumb - shown when in setlist view */}
      {currentPage === 'songs' && currentSessionName && (
        <SessionBreadcrumb
          sessionName={currentSessionName}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onBackToSessions={handleBackToSessions}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Library Sidebar - Left */}
        <LibrarySidebar
          isOpen={isLibraryOpen}
          onToggle={() => setIsLibraryOpen(!isLibraryOpen)}
        />

        {/* Navigation Panel - Page-based (Sessions/Songs) */}
        <aside className="w-80 border-r border-border bg-card/30 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Page container with slide animation */}
          <div className="flex-1 relative overflow-hidden">
            {/* Sessions Page */}
            <div
              className={cn(
                'absolute inset-0 transition-transform duration-300 ease-out',
                currentPage === 'sessions'
                  ? 'translate-x-0'
                  : '-translate-x-full',
              )}
            >
              <SessionList
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onCreateSession={createSession}
                onDeleteSession={deleteSession}
                onRenameSession={renameSession}
              />
            </div>

            {/* Songs Page */}
            <div
              className={cn(
                'absolute inset-0 transition-transform duration-300 ease-out',
                currentPage === 'songs' ? 'translate-x-0' : 'translate-x-full',
              )}
            >
              <UnifiedNavigator onBack={handleBackToSessions} />
            </div>
          </div>
        </aside>

        {/* Center Area - Live Preview + Controls */}
        <main className="flex-1 bg-background flex flex-col overflow-hidden min-w-0">
          {/* Live Preview - Takes most of the space */}
          <div className="flex-1 min-h-0">
            <LivePreview />
          </div>

          {/* Control Panel - Fixed at bottom */}
          <ControlPanel />
        </main>

        {/* Settings Panel - Right */}
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          theme={theme}
          onThemeChange={setTheme}
          language={language}
          onLanguageChange={setLanguage}
          fonts={detectedFonts}
          selectedFont={fontFamily}
          onFontSelect={setFontFamily}
          fontsLoading={fontsLoading}
          onFontsChange={loadFonts}
          videos={embeddedVideos}
          onVideosChange={loadVideos}
        />
      </div>

      {/* Undo/Redo Toast Notification */}
      {lastAction && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-foreground text-background px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200">
            {lastAction === 'undo' ? t('undoAction') : t('redoAction')}
          </div>
        </div>
      )}

      {/* Import Dialog for file association */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            setImportPreview(null);
          }
        }}
        initialPreview={importPreview || undefined}
      />

      {/* Global Search Dialog (Cmd+K) */}
      <GlobalSearch
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelectSession={handleSelectSession}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </ErrorBoundary>
  );
}
