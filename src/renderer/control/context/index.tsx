import { ReactNode } from 'react';
import { SessionProvider } from './session/SessionContext';
import { SetlistProvider } from './setlist/SetlistContext';
import { PresentationProvider } from './presentation/PresentationContext';
import { ProjectionProvider } from './projection/ProjectionContext';
import { MediaProvider } from './media/MediaContext';

// Re-export all hooks
export { useSession } from './session/SessionContext';
export { useSetlist } from './setlist/SetlistContext';
export { usePresentation } from './presentation/PresentationContext';
export { useProjection } from './projection/ProjectionContext';
export { useMedia } from './media/MediaContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Composes all app context providers in the correct dependency order:
 * 1. SessionProvider (no deps)
 * 2. SetlistProvider (depends on Session)
 * 3. PresentationProvider (depends on Setlist)
 * 4. MediaProvider (depends on Presentation)
 * 5. ProjectionProvider (depends on Presentation, Media)
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SessionProvider>
      <SetlistProvider>
        <PresentationProvider>
          <MediaProvider>
            <ProjectionProvider>{children}</ProjectionProvider>
          </MediaProvider>
        </PresentationProvider>
      </SetlistProvider>
    </SessionProvider>
  );
}
