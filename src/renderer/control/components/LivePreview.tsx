import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff, MonitorOff } from 'lucide-react';
import { usePresentation, useProjection, useMedia } from '../context';
import { cn } from '../../lib/utils';

// Scale factor: preview is approximately this fraction of a 1080p screen
const PREVIEW_SCALE_BASE = 1080;

export default function LivePreview() {
  const { t } = useTranslation();
  const { currentSlide, currentSong, presentationState } = usePresentation();
  const { isProjectionOpen, isBlank, isVerseHidden, projectionSettings } =
    useProjection();
  const { fontFamily, detectedFonts, currentVideoPath } = useMedia();

  const loadedFontsRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewScale, setPreviewScale] = useState(0.15);

  // Load fonts for preview
  useEffect(() => {
    const loadFonts = async () => {
      for (const font of detectedFonts) {
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
  }, [detectedFonts]);

  // Calculate preview scale based on container size
  useLayoutEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return;
      const containerHeight = containerRef.current.clientHeight;
      // Scale relative to 1080p height
      setPreviewScale(containerHeight / PREVIEW_SCALE_BASE);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // Handle video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideoPath) return;

    // Convert file path to file:// URL
    let videoUrl: string;
    if (currentVideoPath.startsWith('file://')) {
      videoUrl = currentVideoPath;
    } else {
      const encodedPath = currentVideoPath
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
      videoUrl = `file://${encodedPath}`;
    }

    if (video.src !== videoUrl) {
      video.src = videoUrl;
      video.load();
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(console.error);
      });
    }
  }, [currentVideoPath]);

  // Build text shadow from settings
  const textShadowParts: string[] = [];
  if (projectionSettings.textShadow.enabled) {
    const s = projectionSettings.textShadow;
    const scaledBlur = s.blur * previewScale;
    textShadowParts.push(
      `${s.offsetX * previewScale}px ${s.offsetY * previewScale}px ${scaledBlur}px ${s.color}`,
    );
    textShadowParts.push(`0 0 ${scaledBlur * 2}px ${s.color}`);
    textShadowParts.push(`0 0 ${scaledBlur * 4}px rgba(0,0,0,0.5)`);
  }
  const textShadow = textShadowParts.join(', ');

  // Build text outline style
  const textOutlineStyle = projectionSettings.textOutline.enabled
    ? {
        WebkitTextStroke: `${projectionSettings.textOutline.width * previewScale}px ${projectionSettings.textOutline.color}`,
        paintOrder: 'stroke fill' as const,
      }
    : {};

  // Alignment classes (in flex row: justify = horizontal, items = vertical)
  const justifyContent = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[projectionSettings.textAlign.horizontal];

  const alignItems = {
    top: 'items-start',
    middle: 'items-center',
    bottom: 'items-end',
  }[projectionSettings.textAlign.vertical];

  // CSS text-align for text justification within the block
  const textJustify = projectionSettings.textJustify ?? 'center';
  const textAlignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[textJustify];

  // Get padding values
  const padding = projectionSettings.padding ?? {
    top: 5,
    bottom: 5,
    left: 5,
    right: 5,
  };

  // Scaled font size
  const scaledFontSize = projectionSettings.fontSize * previewScale;

  return (
    <div className="flex flex-col h-full bg-card/30">
      {/* Header - standardized h-12 */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
          {t('livePreview')}
        </h2>
        {isProjectionOpen && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            {t('live')}
          </span>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col">
        {/* Preview Container - 16:9 aspect ratio */}
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-border/50 shadow-elevated"
        >
          {/* Video background */}
          <div className="absolute inset-0 bg-black">
            {currentVideoPath ? (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                muted
                playsInline
                autoPlay
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-black" />
            )}
          </div>

          {/* Background Dim Overlay */}
          {projectionSettings.backgroundDim > 0 && (
            <div
              className="absolute inset-0 bg-black pointer-events-none z-[5]"
              style={{ opacity: projectionSettings.backgroundDim / 100 }}
            />
          )}

          {/* Blank overlay */}
          {isBlank && (
            <div className="absolute inset-0 bg-black z-20 flex items-center justify-center">
              <EyeOff className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          {/* Lyrics overlay */}
          {!isBlank && !isVerseHidden && currentSlide && (
            <div
              className={cn(
                'absolute inset-0 flex z-10 overflow-hidden',
                alignItems,
                justifyContent,
              )}
              style={{
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
                  gap: `${(projectionSettings.lineGap ?? 12) * previewScale}px`,
                  maxWidth: '100%',
                  width: '100%',
                }}
              >
                {currentSlide.lines.map((line, index) => (
                  <p
                    key={index}
                    className={cn('font-bold leading-tight', textAlignClass)}
                    style={{
                      fontFamily:
                        fontFamily &&
                        fontFamily !== 'system' &&
                        fontFamily !== 'inherit'
                          ? `"${fontFamily}", serif`
                          : undefined,
                      fontSize: `${scaledFontSize}px`,
                      color: projectionSettings.textColor,
                      textShadow: textShadow || undefined,
                      ...textOutlineStyle,
                      WebkitFontSmoothing: 'antialiased',
                      backfaceVisibility: 'hidden',
                      transform: 'translateZ(0)',
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
          )}

          {/* Verse hidden indicator */}
          {!isBlank && isVerseHidden && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="text-xs text-muted-foreground font-medium opacity-50">
                {t('verseHidden')}
              </p>
            </div>
          )}

          {/* No content indicator */}
          {!currentSlide && !isBlank && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-medium">
                {t('noContent')}
              </p>
            </div>
          )}

          {/* Projection status overlay */}
          {!isProjectionOpen && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 z-30">
              <MonitorOff className="w-6 h-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">
                {t('projectionClosed')}
              </p>
            </div>
          )}
        </div>

        {/* Current song/slide info */}
        <div className="mt-4 text-center">
          {currentSong ? (
            <>
              <h3 className="text-sm font-bold text-foreground truncate">
                {currentSong.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-semibold tabular-nums">
                {t('slide')} {presentationState.currentSlideIndex + 1} /{' '}
                {currentSong.slides.length}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground font-medium">
              {t('selectSong')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
