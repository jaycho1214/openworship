import { useEffect, useState, useRef } from 'react';
import { cn } from '../../lib/utils';

interface ProjectionSettings {
  fontSize: number;
  textColor: string;
  textShadow: {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  textOutline: {
    enabled: boolean;
    width: number;
    color: string;
  };
  backgroundDim: number;
  animation: 'none' | 'fade' | 'slide-up' | 'slide-left';
  textAlign: {
    horizontal: 'left' | 'center' | 'right';
    vertical: 'top' | 'middle' | 'bottom';
  };
  textJustify?: 'left' | 'center' | 'right';
  lineGap?: number;
  padding?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface LyricsOverlayProps {
  lines: string[];
  fontFamily?: string;
  settings?: ProjectionSettings;
  isHidden?: boolean;
}

const defaultSettings: ProjectionSettings = {
  fontSize: 72,
  textColor: '#ffffff',
  textShadow: {
    enabled: true,
    offsetX: 0,
    offsetY: 0,
    blur: 8,
    color: 'rgba(0,0,0,0.9)',
  },
  textOutline: {
    enabled: false,
    width: 2,
    color: '#000000',
  },
  backgroundDim: 0,
  animation: 'fade',
  textAlign: {
    horizontal: 'center',
    vertical: 'middle',
  },
  textJustify: 'center',
  lineGap: 12,
  padding: {
    top: 5,
    bottom: 5,
    left: 5,
    right: 5,
  },
};

export default function LyricsOverlay({
  lines,
  fontFamily = 'inherit',
  settings = defaultSettings,
  isHidden = false,
}: LyricsOverlayProps) {
  const s = { ...defaultSettings, ...settings };
  const [currentLines, setCurrentLines] = useState<string[]>(lines);
  const [opacity, setOpacity] = useState(1);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const animate = s.animation !== 'none';

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!animate) {
      setCurrentLines(lines);
      setOpacity(lines.length > 0 ? 1 : 0);
      return;
    }

    // If content is the same, do nothing
    if (JSON.stringify(lines) === JSON.stringify(currentLines)) {
      return;
    }

    // Fade out
    setOpacity(0);

    // After fade out, swap content and fade in
    timeoutRef.current = setTimeout(() => {
      setCurrentLines(lines);
      // Small delay before fading in to ensure content is rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpacity(lines.length > 0 ? 1 : 0);
        });
      });
    }, 150);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [lines, animate]);

  if (currentLines.length === 0) {
    return null;
  }

  // Build text shadow from settings
  const textShadowParts: string[] = [];
  if (s.textShadow.enabled) {
    textShadowParts.push(
      `${s.textShadow.offsetX}px ${s.textShadow.offsetY}px ${s.textShadow.blur}px ${s.textShadow.color}`,
    );
    // Add additional shadow layers for better readability
    textShadowParts.push(
      `0 0 ${s.textShadow.blur * 2}px ${s.textShadow.color}`,
    );
    textShadowParts.push(`0 0 ${s.textShadow.blur * 4}px rgba(0,0,0,0.5)`);
  }
  const textShadow = textShadowParts.join(', ');

  // Build text outline (using text-stroke)
  const textOutlineStyle = s.textOutline.enabled
    ? {
        WebkitTextStroke: `${s.textOutline.width}px ${s.textOutline.color}`,
        paintOrder: 'stroke fill' as const,
      }
    : {};

  // Alignment classes (in flex row: justify = horizontal, items = vertical)
  const justifyContent = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[s.textAlign.horizontal];

  const alignItems = {
    top: 'items-start',
    middle: 'items-center',
    bottom: 'items-end',
  }[s.textAlign.vertical];

  // Get padding values (default to 5% if not set)
  const padding = s.padding ?? { top: 5, bottom: 5, left: 5, right: 5 };

  // CSS text-align for text justification within the block
  const textJustify = s.textJustify ?? 'center';
  const textAlignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[textJustify];

  // Line gap (default 12px)
  const lineGap = s.lineGap ?? 12;

  return (
    // Outer wrapper for hide verse animation (same as BlankScreen pattern)
    <div
      className="absolute inset-0 z-10 pointer-events-none"
      style={{
        opacity: isHidden ? 0 : 1,
        transition: 'opacity 300ms ease-in-out',
      }}
    >
      <div
        className={cn(
          'absolute inset-0 flex overflow-hidden',
          alignItems,
          justifyContent,
        )}
        style={{
          opacity,
          transition: 'opacity 150ms ease-out',
          paddingTop: `${padding.top}%`,
          paddingBottom: `${padding.bottom}%`,
          paddingLeft: `${padding.left}%`,
          paddingRight: `${padding.right}%`,
        }}
      >
        <div
          className="flex flex-col items-stretch"
          style={{
            backfaceVisibility: 'hidden',
            gap: `${lineGap}px`,
            maxWidth: '100%',
            width: '100%',
          }}
        >
          {currentLines.map((line, index) => (
            <p
              key={index}
              className={cn('font-bold leading-tight', textAlignClass)}
              style={{
                fontFamily:
                  fontFamily && fontFamily !== 'inherit'
                    ? fontFamily
                    : undefined,
                fontSize: `${s.fontSize}px`,
                color: s.textColor,
                textShadow: textShadow || undefined,
                ...textOutlineStyle,
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                // Word-based wrapping (not character-based)
                overflowWrap: 'break-word',
                wordWrap: 'break-word',
                hyphens: 'auto',
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
