import { useState, useEffect, useRef } from 'react';
import VideoBackground from './components/VideoBackground';
import LyricsOverlay from './components/LyricsOverlay';
import BlankScreen from './components/BlankScreen';
import {
  DetectedFont,
  ProjectionSettings,
  defaultProjectionSettings,
} from '../shared/types/song';

// System font uses inherited/default font family
const SYSTEM_FONT = 'inherit';

export default function App() {
  const [currentLines, setCurrentLines] = useState<string[]>([]);
  const [isBlank, setIsBlank] = useState(false);
  const [isVerseHidden, setIsVerseHidden] = useState(false);
  const [projectionSettings, setProjectionSettings] =
    useState<ProjectionSettings>(defaultProjectionSettings);
  const [currentVideoPath, setCurrentVideoPath] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string>(SYSTEM_FONT);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const loadedFontsRef = useRef<Set<string>>(new Set());
  const fontsDataRef = useRef<DetectedFont[]>([]);

  // Load projection settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electron.settings.getProjection();
        setProjectionSettings(settings);
        console.log('[Projection] Loaded settings:', settings);
      } catch (error) {
        console.error('[Projection] Failed to load settings:', error);
      }
    };
    loadSettings();

    // Listen for settings updates from control window
    const unsubSettings = window.electron.settings.onProjectionSettings(
      (settings: ProjectionSettings) => {
        console.log('[Projection] Settings updated:', settings);
        setProjectionSettings(settings);
      },
    );

    return () => {
      unsubSettings();
    };
  }, []);

  // Load all user fonts on mount
  useEffect(() => {
    const loadFonts = async () => {
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
        console.log('[Projection] Loading fonts:', fonts.length);
        fontsDataRef.current = fonts;

        // Load all fonts into document.fonts
        for (const font of fonts) {
          if (!loadedFontsRef.current.has(font.name)) {
            try {
              const fontFace = new FontFace(font.name, `url(${font.dataUrl})`);
              await fontFace.load();
              document.fonts.add(fontFace);
              loadedFontsRef.current.add(font.name);
              console.log(`[Projection] Loaded font: ${font.name}`);
            } catch (error) {
              console.error(
                `[Projection] Failed to load font ${font.name}:`,
                error,
              );
            }
          }
        }

        // Default to system font (control window will send selected font preference)
        setFontFamily(SYSTEM_FONT);
        console.log('[Projection] Set default font to system font');

        setFontsLoaded(true);
        console.log('[Projection] All fonts loaded');
      } catch (error) {
        console.error('[Projection] Failed to load fonts:', error);
        setFontsLoaded(true); // Still mark as loaded so we can proceed
      }
    };

    loadFonts();
  }, []);

  // Listen for IPC messages from control window - only after fonts are loaded
  useEffect(() => {
    if (!fontsLoaded) return;

    const { electron } = window as Window &
      typeof globalThis & {
        electron: {
          projection: {
            onUpdate: (
              callback: (data: { lines: string[] }) => void,
            ) => () => void;
            onBlank: (callback: (isBlank: boolean) => void) => () => void;
            onVerseHidden: (
              callback: (isVerseHidden: boolean) => void,
            ) => () => void;
            onVideo: (callback: (videoPath: string) => void) => () => void;
            onFont: (callback: (fontFamily: string) => void) => () => void;
            sendReady: () => void;
          };
        };
      };

    // Subscribe to lyrics updates
    const unsubUpdate = electron.projection.onUpdate((data) => {
      setCurrentLines(data.lines);
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
      console.log('Projection received video:', videoPath);
      setCurrentVideoPath(videoPath);
    });

    // Subscribe to font changes
    const unsubFont = electron.projection.onFont(async (font) => {
      console.log('[Projection] Received font change:', font);
      console.log(
        '[Projection] Currently loaded fonts:',
        Array.from(loadedFontsRef.current),
      );

      // Use system font if 'system', 'inherit', or empty is received
      if (!font || font === 'system' || font === 'inherit') {
        console.log('[Projection] Using system font');
        setFontFamily(SYSTEM_FONT);
        return;
      }

      // Check if font is already loaded
      if (loadedFontsRef.current.has(font)) {
        console.log('[Projection] Font already loaded, setting:', font);
        setFontFamily(`"${font}"`);
        return;
      }

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
          console.log(`[Projection] Dynamically loaded font: ${fontData.name}`);
          setFontFamily(`"${font}"`);
        } catch (error) {
          console.error(`[Projection] Failed to load font ${font}:`, error);
          setFontFamily(`"${font}"`); // Try anyway
        }
      } else {
        console.warn(`[Projection] Font not found in available fonts: ${font}`);
        setFontFamily(`"${font}"`); // Try anyway in case it's a system font
      }
    });

    // Signal to control window that projection is ready to receive messages
    // This now happens AFTER fonts are loaded
    console.log(
      '[Projection] Fonts ready, sending ready signal to control window',
    );
    electron.projection.sendReady();

    // Cleanup subscriptions on unmount
    return () => {
      unsubUpdate();
      unsubBlank();
      unsubVerseHidden();
      unsubVideo();
      unsubFont();
    };
  }, [fontsLoaded]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none cursor-none">
      {/* Video Background Layer */}
      <VideoBackground videoPath={currentVideoPath} crossfadeDuration={1000} />

      {/* Background Dim Overlay */}
      {projectionSettings.backgroundDim > 0 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none z-5"
          style={{ opacity: projectionSettings.backgroundDim / 100 }}
        />
      )}

      {/* Lyrics Overlay */}
      {!isBlank && (
        <LyricsOverlay
          lines={currentLines}
          fontFamily={fontFamily}
          settings={projectionSettings}
          isHidden={isVerseHidden}
        />
      )}

      {/* Blank Screen Overlay */}
      <BlankScreen isBlank={isBlank} />
    </div>
  );
}
