import { useState } from 'react';
import { AppProviders, useSession } from './context';
import Header from './components/Header';
import SessionList from './components/SessionList';
import LivePreview from './components/LivePreview';
import UnifiedNavigator from './components/UnifiedNavigator';
import ControlPanel from './components/ControlPanel';
import LibrarySidebar from './components/LibrarySidebar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { cn } from '../lib/utils';

// Page-based navigation type
type NavigationPage = 'sessions' | 'songs';

function AppContent() {
  useKeyboardShortcuts();
  const {
    currentSessionId,
    createSession,
    loadSession,
    deleteSession,
    renameSession,
  } = useSession();

  // Page-based navigation state
  const [currentPage, setCurrentPage] = useState<NavigationPage>('sessions');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Handle session selection - navigate to songs page
  const handleSelectSession = (sessionId: string) => {
    loadSession(sessionId);
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
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
