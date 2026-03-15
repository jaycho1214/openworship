import { ReactNode } from 'react';
import { SessionProvider } from './session/SessionContext';
import { SetlistProvider } from './setlist/SetlistContext';
import { PresentationProvider } from './presentation/PresentationContext';
import { ProjectionProvider } from './projection/ProjectionContext';
import { MediaProvider } from './media/MediaContext';
import { AdvertisementProvider } from './advertisement/AdvertisementContext';
import { BibleProvider } from './bible/BibleContext';
import { FrameProvider } from './frame/FrameContext';
import { UndoProvider } from './undo/UndoContext';

// Re-export all hooks
export { useSession } from './session/SessionContext';
export { useSetlist } from './setlist/SetlistContext';
export { usePresentation } from './presentation/PresentationContext';
export { useProjection } from './projection/ProjectionContext';
export { useMedia } from './media/MediaContext';
export { useAdvertisement } from './advertisement/AdvertisementContext';
export { useBible } from './bible/BibleContext';
export { useFrame } from './frame/FrameContext';
export { useUndo } from './undo/UndoContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Composes all app context providers in the correct dependency order:
 * 1. SessionProvider (no deps)
 * 2. BibleProvider (no deps)
 * 3. FrameProvider (no deps)
 * 4. UndoProvider (no deps — tracks CRUD actions)
 * 5. SetlistProvider (depends on Session, Undo)
 * 6. PresentationProvider (depends on Setlist)
 * 7. MediaProvider (depends on Presentation)
 * 8. ProjectionProvider (depends on Presentation, Media, Frame)
 * 9. AdvertisementProvider (no deps, but placed at end for consistency)
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SessionProvider>
      <BibleProvider>
        <FrameProvider>
          <UndoProvider>
            <SetlistProvider>
              <PresentationProvider>
                <MediaProvider>
                  <ProjectionProvider>
                    <AdvertisementProvider>{children}</AdvertisementProvider>
                  </ProjectionProvider>
                </MediaProvider>
              </PresentationProvider>
            </SetlistProvider>
          </UndoProvider>
        </FrameProvider>
      </BibleProvider>
    </SessionProvider>
  );
}
