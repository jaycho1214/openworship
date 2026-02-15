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
import { DetectedFont } from '../../../shared/types/song';
import { usePresentation } from '../presentation/PresentationContext';
import type { BackgroundType } from '../../../../shared/types';

import { getElectron } from '../../../shared/hooks/useElectron';

interface MediaContextType {
  // Background type and settings
  backgroundType: BackgroundType;
  setBackgroundType: (type: BackgroundType, color?: string) => void;

  // Videos
  embeddedVideos: string[];
  currentVideoPath: string | null;
  isVideoShuffleEnabled: boolean;
  selectVideo: (path: string) => void;
  toggleVideoShuffle: () => void;
  loadVideos: () => Promise<void>;

  // Images
  availableImages: string[];
  currentImagePath: string | null;
  selectImage: (path: string) => void;
  loadImages: () => Promise<void>;

  // Background color
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;

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

  // Background type state
  const [backgroundType, setBackgroundTypeState] =
    useState<BackgroundType>('video');

  // Video state
  const [embeddedVideos, setEmbeddedVideos] = useState<string[]>([]);
  const [currentVideoPath, setCurrentVideoPath] = useState<string | null>(null);
  const [isVideoShuffleEnabled, setIsVideoShuffleEnabled] = useState(true);
  const prevSongIndexRef = useRef<number>(0);

  // Image state
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);

  // Background color state
  const [backgroundColor, setBackgroundColorState] =
    useState<string>('#000000');

  // Font state
  const [fontFamily, setFontFamilyState] = useState<string>('inherit');
  const [availableFonts, setAvailableFonts] = useState<string[]>([]);
  const [detectedFonts, setDetectedFonts] = useState<DetectedFont[]>([]);
  const [fontsLoading, setFontsLoading] = useState<boolean>(true);

  // Load videos
  const loadVideos = useCallback(async (): Promise<void> => {
    const electron = getElectron();
    if (!electron?.videos) return;

    try {
      const videos = await electron.videos.getEmbedded();
      console.log('Loaded embedded videos:', videos);
      setEmbeddedVideos(videos);
      // Select initial random video if none selected
      if (videos.length > 0 && !currentVideoPath) {
        const randomVideo = videos[Math.floor(Math.random() * videos.length)];
        setCurrentVideoPath(randomVideo);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  }, [currentVideoPath]);

  // Load videos on mount
  useEffect(() => {
    loadVideos();
  }, []);

  // FIX: Load background settings on mount
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    const loadBackgroundSettings = async () => {
      try {
        const settings = await electron.settings.getProjection();
        if (settings.backgroundType) {
          setBackgroundTypeState(settings.backgroundType);
        }
        if (settings.backgroundColor) {
          setBackgroundColorState(settings.backgroundColor);
        }
      } catch (error) {
        console.error('Failed to load background settings:', error);
      }
    };
    loadBackgroundSettings();
  }, []);

  // Select random video when song changes (if shuffle enabled and using video background)
  useEffect(() => {
    if (presentationState.currentSongIndex !== prevSongIndexRef.current) {
      prevSongIndexRef.current = presentationState.currentSongIndex;

      // Only shuffle when background type is video
      if (
        isVideoShuffleEnabled &&
        backgroundType === 'video' &&
        embeddedVideos.length > 0
      ) {
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
    backgroundType,
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

  // Load images
  const loadImages = useCallback(async (): Promise<void> => {
    const electron = getElectron();
    if (!electron?.images) return;

    try {
      const images = await electron.images.getAll();
      console.log('Loaded images:', images);
      setAvailableImages(images);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  }, []);

  // Load images on mount
  useEffect(() => {
    loadImages();
  }, []);

  // Select image
  const selectImage = useCallback((path: string) => {
    setCurrentImagePath(path);
    const electron = getElectron();
    if (electron) {
      electron.projection.setImage(path);
    }
  }, []);

  // Set background type
  const setBackgroundType = useCallback(
    (type: BackgroundType, color?: string) => {
      setBackgroundTypeState(type);
      const electron = getElectron();

      // When switching to color, auto-disable shuffle and optionally set color
      if (type === 'color') {
        setIsVideoShuffleEnabled(false);
        if (color) {
          setBackgroundColorState(color);
        }
      }

      // Send appropriate background to projection based on type
      if (electron) {
        if (type === 'video' && currentVideoPath) {
          electron.projection.setVideo(currentVideoPath);
        } else if (type === 'image' && currentImagePath) {
          electron.projection.setImage(currentImagePath);
        } else if (type === 'color') {
          // Use provided color or current backgroundColor
          electron.projection.setBackgroundColor(color || backgroundColor);
        }
        // FIX: Persist background type to settings
        electron.settings.setProjection({
          backgroundType: type,
          backgroundColor: color || backgroundColor,
        });
      }
    },
    [currentVideoPath, currentImagePath, backgroundColor],
  );

  // Set background color
  const setBackgroundColor = useCallback(
    (color: string) => {
      setBackgroundColorState(color);
      const electron = getElectron();
      if (electron && backgroundType === 'color') {
        electron.projection.setBackgroundColor(color);
      }
    },
    [backgroundType],
  );

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

  const contextValue = useMemo(
    () => ({
      backgroundType,
      setBackgroundType,
      embeddedVideos,
      currentVideoPath,
      isVideoShuffleEnabled,
      selectVideo,
      toggleVideoShuffle,
      loadVideos,
      availableImages,
      currentImagePath,
      selectImage,
      loadImages,
      backgroundColor,
      setBackgroundColor,
      fontFamily,
      availableFonts,
      detectedFonts,
      fontsLoading,
      setFontFamily,
      loadFonts,
    }),
    [
      backgroundType,
      setBackgroundType,
      embeddedVideos,
      currentVideoPath,
      isVideoShuffleEnabled,
      selectVideo,
      toggleVideoShuffle,
      loadVideos,
      availableImages,
      currentImagePath,
      selectImage,
      loadImages,
      backgroundColor,
      setBackgroundColor,
      fontFamily,
      availableFonts,
      detectedFonts,
      fontsLoading,
      setFontFamily,
      loadFonts,
    ],
  );

  return (
    <MediaContext.Provider value={contextValue}>
      {children}
    </MediaContext.Provider>
  );
}
