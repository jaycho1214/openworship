import { useEffect, useState, useRef, CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import type {
  AdvertisementPosition,
  AdvertisementPadding,
} from '../../../shared/types/advertisement';
import type { Frame } from '../../../shared/types/frame';
import {
  type ProjectionSettings,
  type ContentTypeTextSettings,
  type BibleReferenceStyle,
  defaultProjectionSettings,
} from '../../../shared/types/settings';
import { getFrameStyle } from '../../shared/utils/frameStyles';
import type { SlideOverrides } from '../../shared/types/song';
import type { SetlistItemType } from '../../../shared/types/setlistItem';

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
  contentType?: SetlistItemType;
  lineRoles?: ('body' | 'reference')[];
  contentTypeTextSettings?: ContentTypeTextSettings;
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
  contentType,
  lineRoles,
  contentTypeTextSettings,
}: LyricsOverlayProps) {
  // Helper to resolve settings from given content type and overrides
  const resolveSettings = (
    ct?: SetlistItemType,
    so?: SlideOverrides,
    sfs?: number,
  ) => {
    const ts =
      contentTypeTextSettings && ct ? contentTypeTextSettings[ct] : undefined;

    const merged = {
      ...defaultProjectionSettings,
      ...settings,
      ...(ts
        ? {
            fontSize: ts.fontSize,
            textColor: ts.textColor,
            textShadow: ts.textShadow,
            textOutline: ts.textOutline,
            textAlign: ts.textAlign,
            textJustify: ts.textJustify,
            lineGap: ts.lineGap,
            padding: ts.padding,
          }
        : {}),
    };

    const refStyle: BibleReferenceStyle | undefined =
      ct === 'bible' && contentTypeTextSettings?.bible
        ? contentTypeTextSettings.bible.referenceStyle
        : undefined;

    return {
      s: merged,
      bibleRefStyle: refStyle,
      effectiveFontSize: sfs ?? so?.fontSize ?? merged.fontSize,
      effectiveTextAlign: {
        horizontal: so?.textAlign?.horizontal ?? merged.textAlign.horizontal,
        vertical: so?.textAlign?.vertical ?? merged.textAlign.vertical,
      },
      effectivePadding: {
        top: so?.padding?.top ?? merged.padding?.top ?? 5,
        bottom: so?.padding?.bottom ?? merged.padding?.bottom ?? 5,
        left: so?.padding?.left ?? merged.padding?.left ?? 5,
        right: so?.padding?.right ?? merged.padding?.right ?? 5,
      },
    };
  };

  // Current settings (for animation detection)
  const { s } = resolveSettings(contentType, slideOverrides, slideFontSize);

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
  // Snapshot of display state — only updates when invisible (between fade-out and fade-in)
  // This prevents layout from jumping before the text has faded out
  const [displayed, setDisplayed] = useState({
    lines,
    contentType,
    lineRoles,
    slideOverrides,
    slideFontSize,
  });
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
      setDisplayed({
        lines,
        contentType,
        lineRoles,
        slideOverrides,
        slideFontSize,
      });
      setOpacity(lines.length > 0 ? 1 : 0);
      return;
    }

    // If content is the same, update styles immediately (no animation needed)
    if (JSON.stringify(lines) === JSON.stringify(currentLinesRef.current)) {
      setDisplayed((prev) => ({
        ...prev,
        contentType,
        lineRoles,
        slideOverrides,
        slideFontSize,
      }));
      return;
    }

    // Fade out
    setOpacity(0);

    // After fade out, swap content AND styles, then fade in
    timeoutRef.current = setTimeout(() => {
      currentLinesRef.current = lines;
      setDisplayed({
        lines,
        contentType,
        lineRoles,
        slideOverrides,
        slideFontSize,
      });
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
  }, [lines, animate, contentType, lineRoles, slideOverrides, slideFontSize]);

  // Resolve render settings from displayed (deferred) state
  const render = resolveSettings(
    displayed.contentType,
    displayed.slideOverrides,
    displayed.slideFontSize,
  );

  if (displayed.lines.length === 0) {
    return null;
  }

  // Build text shadow from render settings (deferred during animation)
  const rs = render.s;
  const textShadowParts: string[] = [];
  if (rs.textShadow.enabled) {
    textShadowParts.push(
      `${rs.textShadow.offsetX}px ${rs.textShadow.offsetY}px ${rs.textShadow.blur}px ${rs.textShadow.color}`,
    );
    textShadowParts.push(
      `0 0 ${rs.textShadow.blur * 2}px ${rs.textShadow.color}`,
    );
    textShadowParts.push(`0 0 ${rs.textShadow.blur * 4}px rgba(0,0,0,0.5)`);
  }
  const textShadow = textShadowParts.join(', ');

  // Build text outline (using text-stroke)
  const textOutlineStyle = rs.textOutline.enabled
    ? {
        WebkitTextStroke: `${rs.textOutline.width}px ${rs.textOutline.color}`,
        paintOrder: 'stroke fill' as const,
      }
    : {};

  // Alignment classes from deferred state
  const justifyContent = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[render.effectiveTextAlign.horizontal];

  const alignItems = {
    top: 'items-start',
    middle: 'items-center',
    bottom: 'items-end',
  }[render.effectiveTextAlign.vertical];

  const padding = render.effectivePadding;

  // CSS text-align for text justification within the block
  const textJustify = rs.textJustify ?? 'center';
  const textAlignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[textJustify];

  // Line gap (default 12px)
  const lineGap = rs.lineGap ?? 12;

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
          transition: 'opacity 150ms ease-out',
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
          {displayed.lines.map((line, index) => {
            const isReference =
              displayed.lineRoles?.[index] === 'reference' &&
              render.bibleRefStyle;
            const lineFontSize = isReference
              ? (displayed.slideOverrides?.referenceFontSize ??
                render.bibleRefStyle!.fontSize)
              : render.effectiveFontSize;
            const lineColor = isReference
              ? (displayed.slideOverrides?.referenceTextColor ??
                render.bibleRefStyle!.textColor)
              : rs.textColor;

            return (
              <p
                key={index} // eslint-disable-line react/no-array-index-key -- lines are positional
                className={cn('font-bold leading-tight', textAlignClass)}
                style={{
                  fontFamily:
                    fontFamily && fontFamily !== 'inherit'
                      ? fontFamily
                      : undefined,
                  fontSize: `${lineFontSize}px`,
                  color: lineColor,
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
