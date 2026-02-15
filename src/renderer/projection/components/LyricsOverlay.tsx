import { useEffect, useState, useRef, CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import type {
  AdvertisementPosition,
  AdvertisementPadding,
} from '../../../shared/types/advertisement';
import type { Frame } from '../../../shared/types/frame';
import {
  type ProjectionSettings,
  defaultProjectionSettings,
} from '../../../shared/types/settings';
import { getFrameStyle } from '../../shared/utils/frameStyles';
import type { SlideOverrides } from '../../shared/types/song';

interface LyricsOverlayProps {
  lines: string[];
  fontFamily?: string;
  settings?: ProjectionSettings;
  isHidden?: boolean;
  isBannerAdVisible?: boolean;
  bannerAdPosition?: AdvertisementPosition;
  bannerAdPadding?: AdvertisementPadding;
  bannerAdFontSize?: number;
  frame?: Frame | null;
  slideFontSize?: number; // Per-slide font size override
  slideOverrides?: SlideOverrides; // Per-slide overrides (position, padding)
}

export default function LyricsOverlay({
  lines,
  fontFamily = 'inherit',
  settings = defaultProjectionSettings,
  isHidden = false,
  isBannerAdVisible = false,
  bannerAdPosition = 'bottom',
  bannerAdPadding = { top: 48, right: 64, bottom: 48, left: 64 },
  bannerAdFontSize = 36,
  frame = null,
  slideFontSize,
  slideOverrides,
}: LyricsOverlayProps) {
  const s = { ...defaultProjectionSettings, ...settings };

  // Use slide-specific font size if provided, otherwise fall back to global setting
  const effectiveFontSize =
    slideFontSize ?? slideOverrides?.fontSize ?? s.fontSize;

  // Use slide-specific text alignment if provided, otherwise fall back to global setting
  const effectiveTextAlign = {
    horizontal: slideOverrides?.textAlign?.horizontal ?? s.textAlign.horizontal,
    vertical: slideOverrides?.textAlign?.vertical ?? s.textAlign.vertical,
  };

  // Use slide-specific padding if provided, otherwise fall back to global setting
  const effectivePadding = {
    top: slideOverrides?.padding?.top ?? s.padding?.top ?? 5,
    bottom: slideOverrides?.padding?.bottom ?? s.padding?.bottom ?? 5,
    left: slideOverrides?.padding?.left ?? s.padding?.left ?? 5,
    right: slideOverrides?.padding?.right ?? s.padding?.right ?? 5,
  };

  // Calculate the actual banner height in pixels
  // Banner height = top padding + content height (fontSize * lineHeight 1.4) + bottom padding
  const bannerHeight = isBannerAdVisible
    ? bannerAdPadding.top + bannerAdFontSize * 1.4 + bannerAdPadding.bottom
    : 0;

  // Calculate pixel offset based on banner position
  const topOffset =
    isBannerAdVisible && bannerAdPosition === 'top' ? bannerHeight : 0;
  const bottomOffset =
    isBannerAdVisible && bannerAdPosition === 'bottom' ? bannerHeight : 0;
  // For middle position, add offset to both sides
  const middleOffset =
    isBannerAdVisible && bannerAdPosition === 'middle' ? bannerHeight / 2 : 0;
  const [currentLines, setCurrentLines] = useState<string[]>(lines);
  const [opacity, setOpacity] = useState(1);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentLinesRef = useRef<string[]>(lines);

  const animate = s.animation !== 'none';

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!animate) {
      currentLinesRef.current = lines;
      setCurrentLines(lines);
      setOpacity(lines.length > 0 ? 1 : 0);
      return;
    }

    // If content is the same, do nothing (use ref to avoid feedback loop)
    if (JSON.stringify(lines) === JSON.stringify(currentLinesRef.current)) {
      return;
    }

    // Fade out
    setOpacity(0);

    // After fade out, swap content and fade in
    timeoutRef.current = setTimeout(() => {
      currentLinesRef.current = lines;
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
  }[effectiveTextAlign.horizontal];

  const alignItems = {
    top: 'items-start',
    middle: 'items-center',
    bottom: 'items-end',
  }[effectiveTextAlign.vertical];

  // Use effective padding (already computed above)
  const padding = effectivePadding;

  // CSS text-align for text justification within the block
  const textJustify = s.textJustify ?? 'center';
  const textAlignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[textJustify];

  // Line gap (default 12px)
  const lineGap = s.lineGap ?? 12;

  // Get frame styles if frame is set
  const frameStyle = frame ? getFrameStyle(frame) : {};
  const hasFrame = frame !== null;

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
          'absolute left-0 right-0 flex overflow-hidden',
          alignItems,
          justifyContent,
        )}
        style={{
          opacity,
          transition:
            'opacity 150ms ease-out, top 300ms ease-in-out, bottom 300ms ease-in-out',
          // Use pixel-based offsets for banner, percentage for user padding
          top: topOffset + middleOffset,
          bottom: bottomOffset + middleOffset,
          paddingTop: `${padding.top}%`,
          paddingBottom: `${padding.bottom}%`,
          paddingLeft: `${padding.left}%`,
          paddingRight: `${padding.right}%`,
        }}
      >
        {/* Frame container - wraps content when a frame is set */}
        <div
          className={cn(
            'flex flex-col items-stretch',
            hasFrame && 'p-4', // Add internal padding when frame is present
          )}
          style={{
            backfaceVisibility: 'hidden',
            gap: `${lineGap}px`,
            maxWidth: '100%',
            width: hasFrame ? 'auto' : '100%',
            ...(frameStyle as CSSProperties),
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
                fontSize: `${effectiveFontSize}px`,
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
