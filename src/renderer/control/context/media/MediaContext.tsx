import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { DetectedFont } from '../../../shared/types/song';
import { usePresentation } from '../presentation/PresentationContext';

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

interface MediaContextType {
  // Videos
  embeddedVideos: string[];
  currentVideoPath: string | null;
  isVideoShuffleEnabled: boolean;
  selectVideo: (path: string) => void;
  toggleVideoShuffle: () => void;
  loadVideos: () => Promise<void>;

  // Fonts
  fontFamily: string;
  availableFonts: string[];
  detectedFonts: DetectedFont[];
  fontsLoading: boolean;
  setFontFamily: (font: string) => void;
  loadFonts: () => Promise<void>;
}

const MediaContext = createContext<MediaContextType | null>(null);

export function useMedia() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
}

interface MediaProviderProps {
  children: ReactNode;
}

export function MediaProvider({ children }: MediaProviderProps) {
  const { presentationState } = usePresentation();

  // Video state
  const [embeddedVideos, setEmbeddedVideos] = useState<string[]>([]);
  const [currentVideoPath, setCurrentVideoPath] = useState<string | null>(null);
  const [isVideoShuffleEnabled, setIsVideoShuffleEnabled] = useState(true);
  const prevSongIndexRef = useRef<number>(0);

  // Font state
  const [fontFamily, setFontFamilyState] = useState<string>('inherit');
  const [availableFonts, setAvailableFonts] = useState<string[]>([]);
  const [detectedFonts, setDetectedFonts] = useState<DetectedFont[]>([]);
  const [fontsLoading, setFontsLoading] = useState<boolean>(true);

  // Load videos
  const loadVideos = useCallback(async (): Promise<void> => {
    const electron = getElectron();
    if (!electron?.videos) return;

    const videos = await electron.videos.getEmbedded();
    console.log('Loaded embedded videos:', videos);
    setEmbeddedVideos(videos);
    // Select initial random video if none selected
    if (videos.length > 0 && !currentVideoPath) {
      const randomVideo = videos[Math.floor(Math.random() * videos.length)];
      setCurrentVideoPath(randomVideo);
    }
  }, [currentVideoPath]);

  // Load videos on mount
  useEffect(() => {
    loadVideos();
  }, []);

  // Select random video when song changes (if shuffle enabled)
  useEffect(() => {
    if (presentationState.currentSongIndex !== prevSongIndexRef.current) {
      prevSongIndexRef.current = presentationState.currentSongIndex;

      if (isVideoShuffleEnabled && embeddedVideos.length > 0) {
        const electron = getElectron();
        let availableVids = embeddedVideos.filter(
          (v) => v !== currentVideoPath,
        );
        if (availableVids.length === 0) {
          availableVids = embeddedVideos;
        }
        const randomVideo =
          availableVids[Math.floor(Math.random() * availableVids.length)];
        setCurrentVideoPath(randomVideo);
        if (electron) {
          electron.projection.setVideo(randomVideo);
        }
      }
    }
  }, [
    presentationState.currentSongIndex,
    embeddedVideos,
    currentVideoPath,
    isVideoShuffleEnabled,
  ]);

  const selectVideo = useCallback((path: string) => {
    setCurrentVideoPath(path);
    const electron = getElectron();
    if (electron) {
      electron.projection.setVideo(path);
    }
  }, []);

  const toggleVideoShuffle = useCallback(() => {
    setIsVideoShuffleEnabled((prev) => !prev);
  }, []);

  // Load fonts
  const loadFonts = useCallback(async () => {
    const electron = getElectron();
    if (!electron?.fonts) {
      setFontsLoading(false);
      return;
    }

    setFontsLoading(true);
    try {
      const fonts = await electron.fonts.getAll();
      console.log('Loaded fonts:', fonts);
      setDetectedFonts(fonts);
      setAvailableFonts(fonts.map((f: DetectedFont) => f.name));

      if (fontFamily === 'inherit' && fonts.length > 0) {
        setFontFamilyState(fonts[0].name);
      }
    } catch (error) {
      console.error('Failed to load fonts:', error);
    } finally {
      setFontsLoading(false);
    }
  }, [fontFamily]);

  // Load fonts on mount
  useEffect(() => {
    loadFonts();
  }, []);

  const setFontFamily = useCallback((font: string) => {
    setFontFamilyState(font);
    const electron = getElectron();
    if (electron) {
      electron.projection.setFont(font);
    }
  }, []);

  return (
    <MediaContext.Provider
      value={{
        embeddedVideos,
        currentVideoPath,
        isVideoShuffleEnabled,
        selectVideo,
        toggleVideoShuffle,
        loadVideos,
        fontFamily,
        availableFonts,
        detectedFonts,
        fontsLoading,
        setFontFamily,
        loadFonts,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
}
