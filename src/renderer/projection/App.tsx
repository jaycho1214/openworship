import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ProjectionRenderer from './components/ProjectionRenderer';
import { DetectedFont, SlideOverrides } from '../shared/types/song';
import { useFontLoader } from '../shared/hooks/useFontLoader';
import type {
  BackgroundType,
  Advertisement,
  ProjectionSettings,
} from '../../shared/types';
import {
  defaultProjectionSettings,
  mergeProjectionSettings,
} from '../../shared/types';
import {
  AdvertisementDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  ProjectionAdvertisementMessage,
} from '../../shared/types/advertisement';
import type { Frame } from '../../shared/types/frame';
import type { SetlistItemType } from '../../shared/types/setlistItem';
import type { ContentTypeTextSettings } from '../../shared/types/settings';

// System font uses inherited/default font family
const SYSTEM_FONT = 'inherit';

export default function App() {
  const { t } = useTranslation();
  const [currentLines, setCurrentLines] = useState<string[]>([]);
  const [slideFontSize, setSlideFontSize] = useState<number | undefined>(
    undefined,
  );
  const [slideOverrides, setSlideOverrides] = useState<
    SlideOverrides | undefined
  >(undefined);
  const [isBlank, setIsBlank] = useState(false);
  const [isVerseHidden, setIsVerseHidden] = useState(false);
  const [projectionSettings, setProjectionSettings] =
    useState<ProjectionSettings>(defaultProjectionSettings);
  const [currentVideoPath, setCurrentVideoPath] = useState<string | null>(null);
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>('#000000');
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('video');
  const [fontFamily, setFontFamily] = useState<string>(SYSTEM_FONT);
  const [fetchedFonts, setFetchedFonts] = useState<DetectedFont[]>([]);
  const { loadedFontsRef, fontsLoaded } = useFontLoader(fetchedFonts);
  const fontsDataRef = useRef<DetectedFont[]>([]);
  const pendingFontRef = useRef<string | null>(null); // Track font requested before fonts loaded
  const [isAdVisible, setIsAdVisible] = useState(false);
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);
  const [adDisplaySettings, setAdDisplaySettings] =
    useState<AdvertisementDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [currentFrame, setCurrentFrame] = useState<Frame | null>(null);
  const [contentType, setContentType] = useState<SetlistItemType | undefined>(
    undefined,
  );
  const [lineRoles, setLineRoles] = useState<
    ('body' | 'reference')[] | undefined
  >(undefined);
  const [contentTypeTextSettings, setContentTypeTextSettings] = useState<
    ContentTypeTextSettings | undefined
  >(undefined);
  const [isOverlayNoteVisible, setIsOverlayNoteVisible] = useState(false);
  const [overlayNoteContent, setOverlayNoteContent] = useState<
    string | undefined
  >(undefined);
  const [overlayNoteContentType, setOverlayNoteContentType] = useState<
    'text' | 'image' | undefined
  >(undefined);
  const [overlayNoteImagePath, setOverlayNoteImagePath] = useState<
    string | undefined
  >(undefined);
  const [overlayNotePosition, setOverlayNotePosition] = useState<
    'top' | 'bottom' | undefined
  >(undefined);

  // Escape key closes projection window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electron.projection.close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update document title based on current language
  useEffect(() => {
    document.title = t('windowTitleProjection');
  }, [t]);

  // Load projection settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electron.settings.getProjection();
        setProjectionSettings(settings);
        // FIX: Initialize background from settings
        if (settings.backgroundType) {
          setBackgroundType(settings.backgroundType);
        }
        if (settings.backgroundColor) {
          setBackgroundColor(settings.backgroundColor);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Projection] Failed to load settings:', error);
      }

      // Load content-type text settings
      try {
        const result = await window.electron.settings.getContentTypeText();
        if (result.success && result.data) {
          setContentTypeTextSettings(result.data);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          '[Projection] Failed to load content type text settings:',
          error,
        );
      }
    };
    loadSettings();

    // Listen for settings updates from control window
    const unsubSettings = window.electron.settings.onProjectionSettings(
      (settings: ProjectionSettings) => {
        setProjectionSettings(settings);
      },
    );

    // Listen for content-type text settings updates
    const unsubContentTypeText = window.electron.settings.onContentTypeText(
      (settings: ContentTypeTextSettings) => {
        setContentTypeTextSettings(settings);
      },
    );

    return () => {
      unsubSettings();
      unsubContentTypeText();
    };
  }, []);

  // Fetch all user fonts on mount (non-blocking - projection works immediately with system fonts)
  useEffect(() => {
    const fetchFonts = async () => {
      const { electron } = window as Window &
        typeof globalThis & {
          electron: {
            fonts: {
              getAll: () => Promise<DetectedFont[]>;
            };
          };
        };

      try {
        const fonts = await electron.fonts.getAll();
        fontsDataRef.current = fonts;
        setFetchedFonts(fonts); // Triggers useFontLoader
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Projection] Failed to fetch fonts:', error);
      }
    };

    fetchFonts();
  }, []);

  // Apply pending font once all fonts finish loading
  useEffect(() => {
    if (
      fontsLoaded &&
      pendingFontRef.current &&
      loadedFontsRef.current.has(pendingFontRef.current)
    ) {
      setFontFamily(`"${pendingFontRef.current}"`);
      pendingFontRef.current = null;
    }
  }, [fontsLoaded, loadedFontsRef]);

  // Subscribe to advertisement changes immediately (doesn't need fonts)
  useEffect(() => {
    const { electron } = window as Window &
      typeof globalThis & {
        electron: {
          advertisement: {
            onAdvertisement: (
              callback: (message: ProjectionAdvertisementMessage) => void,
            ) => () => void;
          };
        };
      };

    const unsubAdvertisement = electron.advertisement.onAdvertisement(
      (message) => {
        if (message.action === 'show' && message.advertisement) {
          setCurrentAd(message.advertisement);
          if (message.displaySettings) {
            setAdDisplaySettings(message.displaySettings);
          }
          setIsAdVisible(true);
        } else if (message.action === 'hide') {
          setIsAdVisible(false);
        } else if (
          message.action === 'updateSettings' &&
          message.displaySettings
        ) {
          setAdDisplaySettings(message.displaySettings);
        }
      },
    );

    return () => {
      unsubAdvertisement();
    };
  }, []);

  // Subscribe to frame changes from control window
  useEffect(() => {
    const { electron } = window as Window &
      typeof globalThis & {
        electron: {
          frame: {
            onFrame: (
              callback: (data: {
                frame: Frame | null;
                itemType: SetlistItemType;
              }) => void,
            ) => () => void;
          };
        };
      };

    const unsubFrame = electron.frame.onFrame((data) => {
      setCurrentFrame(data.frame);
    });

    return () => {
      unsubFrame();
    };
  }, []);

  // Subscribe to overlay note changes from control window
  useEffect(() => {
    const unsubOverlayNote = window.electron.projection.onOverlayNote(
      (data) => {
        if (data.action === 'show') {
          setOverlayNoteContent(data.content);
          setOverlayNoteContentType(data.contentType);
          setOverlayNoteImagePath(data.imagePath);
          setOverlayNotePosition(data.position);
          setIsOverlayNoteVisible(true);
        } else {
          setIsOverlayNoteVisible(false);
        }
      },
    );

    return () => {
      unsubOverlayNote();
    };
  }, []);

  // Listen for IPC messages from control window - subscribe immediately (no need to wait for fonts)
  useEffect(() => {
    const { electron } = window as Window &
      typeof globalThis & {
        electron: {
          projection: {
            onUpdate: (
              callback: (data: {
                lines: string[];
                fontSize?: number;
                overrides?: SlideOverrides;
              }) => void,
            ) => () => void;
            onBlank: (callback: (isBlank: boolean) => void) => () => void;
            onVerseHidden: (
              callback: (isVerseHidden: boolean) => void,
            ) => () => void;
            onVideo: (callback: (videoPath: string) => void) => () => void;
            onImage: (callback: (imagePath: string) => void) => () => void;
            onBackgroundColor: (
              callback: (color: string) => void,
            ) => () => void;
            onFont: (callback: (fontFamily: string) => void) => () => void;
            sendReady: () => void;
          };
        };
      };

    // Subscribe to lyrics updates
    const unsubUpdate = electron.projection.onUpdate((data) => {
      setCurrentLines(data.lines);
      setSlideFontSize(data.fontSize);
      setSlideOverrides(data.overrides);
      setContentType(data.contentType as SetlistItemType | undefined);
      setLineRoles(data.lineRoles);
    });

    // Subscribe to blank screen toggle
    const unsubBlank = electron.projection.onBlank((blank) => {
      setIsBlank(blank);
    });

    // Subscribe to verse hidden toggle
    const unsubVerseHidden = electron.projection.onVerseHidden(
      (verseHidden) => {
        setIsVerseHidden(verseHidden);
      },
    );

    // Subscribe to video changes
    const unsubVideo = electron.projection.onVideo((videoPath) => {
      setCurrentVideoPath(videoPath);
      setBackgroundType('video');
    });

    // Subscribe to image changes
    const unsubImage = electron.projection.onImage((imagePath) => {
      setCurrentImagePath(imagePath);
      setBackgroundType('image');
    });

    // Subscribe to background color changes
    const unsubBackgroundColor = electron.projection.onBackgroundColor(
      (color) => {
        setBackgroundColor(color);
        setBackgroundType('color');
      },
    );

    // Subscribe to font changes - handles fonts that may not be loaded yet
    const unsubFont = electron.projection.onFont(async (font) => {
      // Use system font if 'system', 'inherit', or empty is received
      if (!font || font === 'system' || font === 'inherit') {
        pendingFontRef.current = null;
        setFontFamily(SYSTEM_FONT);
        return;
      }

      // Check if font is already loaded
      if (loadedFontsRef.current.has(font)) {
        pendingFontRef.current = null;
        setFontFamily(`"${font}"`);
        return;
      }

      // Font not loaded yet - store as pending and try to load it
      pendingFontRef.current = font;

      // Try to find and load the font from our fonts data
      const fontData = fontsDataRef.current.find((f) => f.name === font);
      if (fontData) {
        try {
          const fontFace = new FontFace(
            fontData.name,
            `url(${fontData.dataUrl})`,
          );
          await fontFace.load();
          document.fonts.add(fontFace);
          loadedFontsRef.current.add(fontData.name);
          if (pendingFontRef.current === font) {
            setFontFamily(`"${font}"`);
            pendingFontRef.current = null;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`[Projection] Failed to load font ${font}:`, error);
          // Keep using system font until the font is loaded via the background load
        }
      }
    });

    // Signal to control window that projection is ready to receive messages immediately
    electron.projection.sendReady();

    // Cleanup subscriptions on unmount
    return () => {
      unsubUpdate();
      unsubBlank();
      unsubVerseHidden();
      unsubVideo();
      unsubImage();
      unsubBackgroundColor();
      unsubFont();
    };
  }, [loadedFontsRef]);

  // Deep merge projection settings with defaults to ensure all nested properties exist
  const mergedSettings = useMemo(
    () => mergeProjectionSettings(projectionSettings),
    [projectionSettings],
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none cursor-none">
      <ProjectionRenderer
        videoPath={currentVideoPath}
        imagePath={currentImagePath}
        backgroundColor={backgroundColor}
        backgroundType={backgroundType}
        lines={currentLines}
        fontFamily={fontFamily}
        settings={mergedSettings}
        slideFontSize={slideFontSize}
        slideOverrides={slideOverrides}
        isBlank={isBlank}
        isVerseHidden={isVerseHidden}
        isAdVisible={isAdVisible}
        currentAd={currentAd}
        adDisplaySettings={adDisplaySettings}
        frame={currentFrame}
        contentType={contentType}
        lineRoles={lineRoles}
        contentTypeTextSettings={contentTypeTextSettings}
        isOverlayNoteVisible={isOverlayNoteVisible}
        overlayNoteContent={overlayNoteContent}
        overlayNoteContentType={overlayNoteContentType}
        overlayNoteImagePath={overlayNoteImagePath}
        overlayNotePosition={overlayNotePosition}
      />
    </div>
  );
}
