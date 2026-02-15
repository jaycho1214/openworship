import { useEffect, useRef, useState } from 'react';
import type { DetectedFont } from '../../../shared/types/song';

/**
 * Shared hook to load DetectedFont[] into the document via the FontFace API.
 * Fonts are loaded in parallel and deduplicated across calls.
 *
 * @param fonts - Array of DetectedFont objects to load
 * @returns loadedFonts ref (Set of loaded font names) and fontsLoaded flag
 */
export function useFontLoader(fonts: DetectedFont[]) {
  const loadedFontsRef = useRef<Set<string>>(new Set());
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if (fonts.length === 0) return;

    let cancelled = false;

    const loadFonts = async () => {
      const fontLoadPromises = fonts
        .filter((font) => !loadedFontsRef.current.has(font.name))
        .map(async (font) => {
          try {
            const fontFace = new FontFace(font.name, `url(${font.dataUrl})`);
            await fontFace.load();
            document.fonts.add(fontFace);
            loadedFontsRef.current.add(font.name);
          } catch (error) {
            console.error(`Failed to load font ${font.name}:`, error);
          }
        });

      await Promise.all(fontLoadPromises);

      if (!cancelled) {
        setFontsLoaded(true);
      }
    };

    loadFonts();

    return () => {
      cancelled = true;
    };
  }, [fonts]);

  return { loadedFontsRef, fontsLoaded };
}
