import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import {
  ProjectionSettings,
  defaultProjectionSettings,
} from '../../../shared/types/song';
import { usePresentation } from '../presentation/PresentationContext';
import { useMedia } from '../media/MediaContext';
import { useFrame } from '../frame/FrameContext';
import { useSetlist } from '../setlist/SetlistContext';
import type { SetlistItemType } from '../../../../shared/types/setlistItem';

import { getElectron } from '../../../shared/hooks/useElectron';

interface ProjectionContextType {
  isProjectionOpen: boolean;
  isBlank: boolean;
  isVerseHidden: boolean;
  projectionSettings: ProjectionSettings;
  openProjection: () => Promise<void>;
  closeProjection: () => Promise<void>;
  toggleBlank: () => void;
  toggleVerseHidden: () => void;
  updateProjectionSettings: (settings: Partial<ProjectionSettings>) => void;
}

const ProjectionContext = createContext<ProjectionContextType | null>(null);

export function useProjection() {
  const context = useContext(ProjectionContext);
  if (!context) {
    throw new Error('useProjection must be used within a ProjectionProvider');
  }
  return context;
}

interface ProjectionProviderProps {
  children: ReactNode;
}

export function ProjectionProvider({ children }: ProjectionProviderProps) {
  const { currentSlide, presentationState } = usePresentation();
  const { currentSetlist } = useSetlist();
  const {
    getFrameForType,
    sendFrameToProjection,
    settings: frameSettings,
  } = useFrame();
  const {
    fontFamily,
    embeddedVideos,
    currentVideoPath,
    selectVideo,
    backgroundType,
    backgroundColor,
    currentImagePath,
  } = useMedia();

  const lastItemTypeRef = useRef<SetlistItemType | null>(null);

  const [isProjectionOpen, setIsProjectionOpen] = useState(false);
  const [isBlank, setIsBlank] = useState(false);
  const [isVerseHidden, setIsVerseHidden] = useState(false);
  const [projectionSettings, setProjectionSettings] =
    useState<ProjectionSettings>(defaultProjectionSettings);

  // Send update to projection window when slide changes
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    if (currentSlide) {
      electron.projection.update({
        lines: currentSlide.lines,
        fontSize: currentSlide.fontSize ?? currentSlide.overrides?.fontSize,
        overrides: currentSlide.overrides,
      });
    } else {
      electron.projection.update({ lines: [] });
    }
  }, [currentSlide]);

  // Update projection blank state
  useEffect(() => {
    const electron = getElectron();
    if (electron) {
      electron.projection.setBlank(isBlank);
    }
  }, [isBlank]);

  // Update projection verse hidden state
  useEffect(() => {
    const electron = getElectron();
    if (electron) {
      electron.projection.setVerseHidden(isVerseHidden);
    }
  }, [isVerseHidden]);

  // Listen for projection window closed
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    const unsubscribe = electron.projection.onClosed(() => {
      setIsProjectionOpen(false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Load projection settings on mount
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    const loadSettings = async () => {
      try {
        const settings = await electron.settings.getProjection();
        setProjectionSettings(settings);
      } catch (error) {
        console.error('Failed to load projection settings:', error);
      }
    };
    loadSettings();

    // Listen for projection settings updates
    const unsubscribe = electron.settings.onProjectionSettings(
      (settings: ProjectionSettings) => {
        setProjectionSettings(settings);
      },
    );
    return () => {
      unsubscribe();
    };
  }, []);

  // Send frame update when current item type changes
  useEffect(() => {
    if (!isProjectionOpen || !currentSetlist) return;

    // Get current item type from setlist items
    const currentItemIndex = presentationState.currentSongIndex;
    const currentItem = currentSetlist.items[currentItemIndex];
    const currentItemType: SetlistItemType = currentItem?.type ?? 'song';

    // Send frame if item type changed
    if (currentItemType !== lastItemTypeRef.current) {
      lastItemTypeRef.current = currentItemType;
      const frame = getFrameForType(currentItemType);
      sendFrameToProjection(frame, currentItemType);
      console.log(
        '[Projection] Sent frame for item type:',
        currentItemType,
        frame,
      );
    }
  }, [
    isProjectionOpen,
    currentSetlist,
    presentationState.currentSongIndex,
    getFrameForType,
    sendFrameToProjection,
  ]);

  // Also send frame update when frame settings change
  useEffect(() => {
    if (!isProjectionOpen || !currentSetlist) return;

    const currentItemIndex = presentationState.currentSongIndex;
    const currentItem = currentSetlist.items[currentItemIndex];
    const currentItemType: SetlistItemType = currentItem?.type ?? 'song';

    const frame = getFrameForType(currentItemType);
    sendFrameToProjection(frame, currentItemType);
    console.log('[Projection] Frame settings changed, sending frame:', frame);
  }, [frameSettings]);

  const toggleBlank = useCallback(() => {
    setIsBlank((prev) => !prev);
  }, []);

  const toggleVerseHidden = useCallback(() => {
    setIsVerseHidden((prev) => !prev);
  }, []);

  const updateProjectionSettings = useCallback(
    async (settings: Partial<ProjectionSettings>) => {
      const electron = getElectron();
      if (!electron) return;

      try {
        await electron.settings.setProjection(settings);
        setProjectionSettings((prev) => ({ ...prev, ...settings }));
      } catch (error) {
        console.error('Failed to update projection settings:', error);
      }
    },
    [],
  );

  const openProjection = useCallback(async () => {
    const electron = getElectron();
    if (!electron) return;

    try {
      // Only shuffle video when background type is video
      let videoToSend = currentVideoPath;
      if (backgroundType === 'video' && embeddedVideos.length > 0) {
        const randomVideo =
          embeddedVideos[Math.floor(Math.random() * embeddedVideos.length)];
        videoToSend = randomVideo;
        selectVideo(randomVideo);
      }

      // Set up listener for projection ready signal BEFORE opening
      const unsubReady = electron.projection.onReady(() => {
        console.log('Received ready signal from projection window');
        if (currentSlide) {
          electron.projection.update({
            lines: currentSlide.lines,
            fontSize: currentSlide.fontSize ?? currentSlide.overrides?.fontSize,
            overrides: currentSlide.overrides,
          });
        } else {
          electron.projection.update({ lines: [] });
        }
        // FIX: Send appropriate background based on current backgroundType
        if (backgroundType === 'video' && videoToSend) {
          electron.projection.setVideo(videoToSend);
        } else if (backgroundType === 'image' && currentImagePath) {
          electron.projection.setImage(currentImagePath);
        } else if (backgroundType === 'color') {
          electron.projection.setBackgroundColor(backgroundColor);
        } else if (videoToSend) {
          // Fallback to video if no background type is set
          electron.projection.setVideo(videoToSend);
        }
        electron.projection.setFont(fontFamily);
        electron.projection.setBlank(isBlank);
        electron.projection.setVerseHidden(isVerseHidden);

        // Send initial frame based on current item type
        if (currentSetlist) {
          const currentItemIndex = presentationState.currentSongIndex;
          const currentItem = currentSetlist.items[currentItemIndex];
          const currentItemType: SetlistItemType = currentItem?.type ?? 'song';
          const frame = getFrameForType(currentItemType);
          sendFrameToProjection(frame, currentItemType);
          lastItemTypeRef.current = currentItemType;
          console.log(
            '[Projection] Sent initial frame:',
            currentItemType,
            frame,
          );
        }

        unsubReady();
      });

      await electron.projection.open();
      setIsProjectionOpen(true);
    } catch (error) {
      console.error('Failed to open projection:', error);
    }
  }, [
    currentSlide,
    currentVideoPath,
    embeddedVideos,
    fontFamily,
    isBlank,
    isVerseHidden,
    selectVideo,
    backgroundType,
    backgroundColor,
    currentImagePath,
    currentSetlist,
    presentationState.currentSongIndex,
    getFrameForType,
    sendFrameToProjection,
  ]);

  const closeProjection = useCallback(async () => {
    const electron = getElectron();
    if (!electron) return;

    try {
      await electron.projection.close();
      setIsProjectionOpen(false);
    } catch (error) {
      console.error('Failed to close projection:', error);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      isProjectionOpen,
      isBlank,
      isVerseHidden,
      projectionSettings,
      openProjection,
      closeProjection,
      toggleBlank,
      toggleVerseHidden,
      updateProjectionSettings,
    }),
    [
      isProjectionOpen,
      isBlank,
      isVerseHidden,
      projectionSettings,
      openProjection,
      closeProjection,
      toggleBlank,
      toggleVerseHidden,
      updateProjectionSettings,
    ],
  );

  return (
    <ProjectionContext.Provider value={contextValue}>
      {children}
    </ProjectionContext.Provider>
  );
}
