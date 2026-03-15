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
import type {
  ProjectionSettings,
  ContentTypeTextSettings,
  BibleReferenceStyle,
} from '../../../../shared/types/settings';
import { defaultProjectionSettings } from '../../../../shared/types/settings';
import { usePresentation } from '../presentation/PresentationContext';
import { useMedia } from '../media/MediaContext';
import { useFrame } from '../frame/FrameContext';
import { useSetlist } from '../setlist/SetlistContext';
import type {
  SetlistItemType,
  AnnouncementSetlistItem,
} from '../../../../shared/types/setlistItem';

import { getElectron } from '../../../shared/hooks/useElectron';

interface ProjectionContextType {
  isProjectionOpen: boolean;
  isBlank: boolean;
  isVerseHidden: boolean;
  projectionSettings: ProjectionSettings;
  contentTypeTextSettings: ContentTypeTextSettings | null;
  openProjection: () => Promise<void>;
  closeProjection: () => Promise<void>;
  toggleBlank: () => void;
  toggleVerseHidden: () => void;
  updateBibleReferenceStyle: (
    updates: Partial<BibleReferenceStyle>,
  ) => Promise<void>;
  overlayNote: AnnouncementSetlistItem | null;
  isOverlayNoteVisible: boolean;
  toggleOverlayNote: (item: AnnouncementSetlistItem) => void;
  hideOverlayNote: () => void;
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
  const [contentTypeTextSettings, setContentTypeTextSettings] =
    useState<ContentTypeTextSettings | null>(null);
  const [overlayNote, setOverlayNote] =
    useState<AnnouncementSetlistItem | null>(null);
  const [isOverlayNoteVisible, setIsOverlayNoteVisible] = useState(false);

  // Determine current content type
  const currentItemIndex = presentationState.currentSongIndex;
  const currentItem = currentSetlist?.items[currentItemIndex];
  const currentContentType: SetlistItemType = currentItem?.type ?? 'song';

  // Send update to projection window when slide changes OR projection opens
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    if (currentSlide) {
      electron.projection.update({
        lines: currentSlide.lines,
        fontSize: currentSlide.fontSize ?? currentSlide.overrides?.fontSize,
        overrides: currentSlide.overrides,
        contentType: currentContentType,
        lineRoles: currentSlide.lineRoles,
      });
    } else {
      electron.projection.update({ lines: [] });
    }
  }, [currentSlide, currentContentType, isProjectionOpen]);

  // Track previous blank state for re-sync on un-blank
  const prevIsBlankRef = useRef(false);

  // Update projection blank state and re-sync background when showing screen
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    electron.projection.setBlank(isBlank);

    // Re-sync background when transitioning from blank to visible
    // This ensures projection matches control after changes made while blanked
    if (prevIsBlankRef.current && !isBlank) {
      if (backgroundType === 'video' && currentVideoPath) {
        electron.projection.setVideo(currentVideoPath);
      } else if (backgroundType === 'image' && currentImagePath) {
        electron.projection.setImage(currentImagePath);
      } else if (backgroundType === 'color') {
        electron.projection.setBackgroundColor(backgroundColor);
      }
      if (fontFamily && fontFamily !== 'inherit') {
        electron.projection.setFont(fontFamily);
      }
    }
    prevIsBlankRef.current = isBlank;
  }, [
    isBlank,
    backgroundType,
    currentVideoPath,
    currentImagePath,
    backgroundColor,
    fontFamily,
  ]);

  // Update projection verse hidden state
  useEffect(() => {
    const electron = getElectron();
    if (electron) {
      electron.projection.setVerseHidden(isVerseHidden);
    }
  }, [isVerseHidden]);

  // Listen for projection window opened (ready signal) and closed
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    const unsubReady = electron.projection.onReady(() => {
      setIsProjectionOpen(true);
    });
    const unsubClosed = electron.projection.onClosed(() => {
      setIsProjectionOpen(false);
    });
    return () => {
      unsubReady();
      unsubClosed();
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

      // Load content-type text settings
      try {
        const result = await electron.settings.getContentTypeText();
        if (result.success && result.data) {
          setContentTypeTextSettings(result.data);
        }
      } catch (error) {
        console.error('Failed to load content type text settings:', error);
      }
    };
    loadSettings();

    // Listen for projection settings updates
    const unsubscribe = electron.settings.onProjectionSettings(
      (settings: ProjectionSettings) => {
        setProjectionSettings(settings);
      },
    );

    // Listen for content-type text settings updates
    const unsubContentTypeText = electron.settings.onContentTypeText(
      (settings: ContentTypeTextSettings) => {
        setContentTypeTextSettings(settings);
      },
    );

    return () => {
      unsubscribe();
      unsubContentTypeText();
    };
  }, []);

  // Send frame update when current item type changes
  useEffect(() => {
    if (!isProjectionOpen || !currentSetlist) return;

    // Get current item type from setlist items
    const itemIdx = presentationState.currentSongIndex;
    const item = currentSetlist.items[itemIdx];
    const itemType: SetlistItemType = item?.type ?? 'song';

    // Send frame if item type changed
    if (itemType !== lastItemTypeRef.current) {
      lastItemTypeRef.current = itemType;
      const frame = getFrameForType(itemType);
      sendFrameToProjection(frame, itemType);
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

    const itemIdx = presentationState.currentSongIndex;
    const item = currentSetlist.items[itemIdx];
    const itemType: SetlistItemType = item?.type ?? 'song';

    const frame = getFrameForType(itemType);
    sendFrameToProjection(frame, itemType);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to frameSettings changes; other deps handled by the item-type effect above
  }, [frameSettings]);

  const toggleBlank = useCallback(() => {
    setIsBlank((prev) => !prev);
  }, []);

  const toggleVerseHidden = useCallback(() => {
    setIsVerseHidden((prev) => !prev);
  }, []);

  const updateBibleReferenceStyle = useCallback(
    async (updates: Partial<BibleReferenceStyle>) => {
      const electron = getElectron();
      if (!electron) return;

      try {
        const result = await electron.settings.setBibleReferenceStyle(updates);
        if (result.success && result.data) {
          setContentTypeTextSettings(result.data);
        }
      } catch (error) {
        console.error('Failed to update bible reference style:', error);
      }
    },
    [],
  );

  const toggleOverlayNote = useCallback(
    (item: AnnouncementSetlistItem) => {
      const electron = getElectron();
      if (!electron) return;

      if (isOverlayNoteVisible && overlayNote?.id === item.id) {
        // Same note visible → hide
        electron.projection.sendOverlayNote({ action: 'hide' });
        setIsOverlayNoteVisible(false);
        setOverlayNote(null);
      } else {
        // Show new overlay note
        electron.projection.sendOverlayNote({
          action: 'show',
          content: item.content,
          contentType: item.contentType || 'text',
          imagePath: item.imagePath,
          position: item.overlayPosition || 'bottom',
        });
        setOverlayNote(item);
        setIsOverlayNoteVisible(true);
      }
    },
    [isOverlayNoteVisible, overlayNote],
  );

  const hideOverlayNote = useCallback(() => {
    const electron = getElectron();
    if (!electron) return;

    electron.projection.sendOverlayNote({ action: 'hide' });
    setIsOverlayNoteVisible(false);
    setOverlayNote(null);
  }, []);

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
        if (currentSlide) {
          electron.projection.update({
            lines: currentSlide.lines,
            fontSize: currentSlide.fontSize ?? currentSlide.overrides?.fontSize,
            overrides: currentSlide.overrides,
            contentType: currentContentType,
            lineRoles: currentSlide.lineRoles,
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
          const initIdx = presentationState.currentSongIndex;
          const initItem = currentSetlist.items[initIdx];
          const initType: SetlistItemType = initItem?.type ?? 'song';
          const frame = getFrameForType(initType);
          sendFrameToProjection(frame, initType);
          lastItemTypeRef.current = initType;
        }

        unsubReady();
      });

      const result = await electron.projection.open();
      if (result && result.data === false) {
        // User cancelled the single-monitor dialog
        unsubReady();
        return;
      }
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
    currentContentType,
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
      contentTypeTextSettings,
      openProjection,
      closeProjection,
      toggleBlank,
      toggleVerseHidden,
      updateBibleReferenceStyle,
      overlayNote,
      isOverlayNoteVisible,
      toggleOverlayNote,
      hideOverlayNote,
    }),
    [
      isProjectionOpen,
      isBlank,
      isVerseHidden,
      projectionSettings,
      contentTypeTextSettings,
      openProjection,
      closeProjection,
      toggleBlank,
      toggleVerseHidden,
      updateBibleReferenceStyle,
      overlayNote,
      isOverlayNoteVisible,
      toggleOverlayNote,
      hideOverlayNote,
    ],
  );

  return (
    <ProjectionContext.Provider value={contextValue}>
      {children}
    </ProjectionContext.Provider>
  );
}
