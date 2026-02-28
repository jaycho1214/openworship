/* eslint-disable no-console */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Type, Check, Loader2 } from 'lucide-react';
import { ScrollArea } from '../../components/ui/scroll-area';
import { cn } from '../../lib/utils';
import type { DetectedFont } from '../../shared/types/song';

interface FontSettingsProps {
  selectedFont: string;
  onFontSelect: (fontName: string) => void;
  fonts: DetectedFont[];
  isLoading?: boolean;
}

export default function FontSettings({
  selectedFont,
  onFontSelect,
  fonts,
  isLoading = false,
}: FontSettingsProps) {
  const { t } = useTranslation();
  const loadedFontsRef = useRef<Set<string>>(new Set());

  // Load font faces dynamically
  useEffect(() => {
    const loadFonts = async () => {
      for (const font of fonts) {
        if (!loadedFontsRef.current.has(font.name)) {
          try {
            const fontFace = new FontFace(font.name, `url(${font.dataUrl})`);
            await fontFace.load();
            document.fonts.add(fontFace);
            loadedFontsRef.current.add(font.name);
          } catch (error) {
            console.error(`Failed to load font ${font.name}:`, error);
          }
        }
      }
    };
    loadFonts();
  }, [fonts]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
          {t('font')}
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (fonts.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
          {t('font')}
        </h3>
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground text-center font-medium">
            {t('noFontsFound')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
        {t('font')}
      </h3>

      <ScrollArea className="h-28">
        <div className="space-y-1.5 py-1">
          {fonts.map((font) => {
            const isSelected = selectedFont === font.name;
            const isLoaded = loadedFontsRef.current.has(font.name);

            return (
              <button
                key={font.fileName}
                onClick={() => onFontSelect(font.name)}
                className={cn(
                  'flex w-full items-center gap-2.5 p-2.5 rounded-lg text-left transition-all duration-150',
                  'border-2 mr-1',
                  isSelected
                    ? 'bg-active border-active-border-subtle shadow-elevated'
                    : 'bg-muted/50 border-transparent hover:bg-muted hover:border-border',
                )}
              >
                <Type
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    isSelected
                      ? 'text-active-foreground'
                      : 'text-muted-foreground',
                  )}
                />
                <span
                  className={cn(
                    'text-xs truncate flex-1 min-w-0',
                    isSelected
                      ? 'text-active-foreground font-semibold'
                      : 'text-foreground font-medium',
                  )}
                  style={{
                    fontFamily: isLoaded ? `"${font.name}", serif` : 'inherit',
                  }}
                >
                  {font.name}
                </span>
                {isSelected && (
                  <Check className="w-4 h-4 text-active-foreground flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
