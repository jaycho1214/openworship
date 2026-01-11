import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  ProjectionSettings,
  defaultProjectionSettings,
} from '../../../shared/types/song';
import { usePresentation } from '../presentation/PresentationContext';
import { useMedia } from '../media/MediaContext';

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

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
  const { currentSlide } = usePresentation();
  const { fontFamily, embeddedVideos, currentVideoPath, selectVideo } =
    useMedia();

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
      electron.projection.update({ lines: currentSlide.lines });
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

    // Shuffle to a random video when projection opens
    let videoToSend = currentVideoPath;
    if (embeddedVideos.length > 0) {
      const randomVideo =
        embeddedVideos[Math.floor(Math.random() * embeddedVideos.length)];
      videoToSend = randomVideo;
      selectVideo(randomVideo);
    }

    // Set up listener for projection ready signal BEFORE opening
    const unsubReady = electron.projection.onReady(() => {
      console.log('Received ready signal from projection window');
      if (currentSlide) {
        electron.projection.update({ lines: currentSlide.lines });
      } else {
        electron.projection.update({ lines: [] });
      }
      if (videoToSend) {
        electron.projection.setVideo(videoToSend);
      }
      electron.projection.setFont(fontFamily);
      electron.projection.setBlank(isBlank);
      electron.projection.setVerseHidden(isVerseHidden);
      unsubReady();
    });

    await electron.projection.open();
    setIsProjectionOpen(true);
  }, [
    currentSlide,
    currentVideoPath,
    embeddedVideos,
    fontFamily,
    isBlank,
    isVerseHidden,
    selectVideo,
  ]);

  const closeProjection = useCallback(async () => {
    const electron = getElectron();
    if (!electron) return;

    await electron.projection.close();
    setIsProjectionOpen(false);
  }, []);

  return (
    <ProjectionContext.Provider
      value={{
        isProjectionOpen,
        isBlank,
        isVerseHidden,
        projectionSettings,
        openProjection,
        closeProjection,
        toggleBlank,
        toggleVerseHidden,
        updateProjectionSettings,
      }}
    >
      {children}
    </ProjectionContext.Provider>
  );
}
