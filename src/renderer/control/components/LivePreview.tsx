import { useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MonitorOff } from 'lucide-react';
import {
  usePresentation,
  useProjection,
  useMedia,
  useAdvertisement,
  useFrame,
} from '../context';
import { defaultProjectionSettings } from '../../shared/types/song';
import ProjectionRenderer from '../../projection/components/ProjectionRenderer';
import { useFontLoader } from '../../shared/hooks/useFontLoader';

const PROJECTION_WIDTH = 1920;
const PROJECTION_HEIGHT = 1080;

export default function LivePreview() {
  const { t } = useTranslation();
  const { currentSlide, currentSong, presentationState, currentItem } =
    usePresentation();
  const {
    isProjectionOpen,
    isBlank,
    isVerseHidden,
    projectionSettings,
    contentTypeTextSettings,
  } = useProjection();
  const {
    fontFamily,
    detectedFonts,
    currentVideoPath,
    backgroundType,
    currentImagePath,
    backgroundColor,
  } = useMedia();
  const {
    isAdVisible,
    currentAd,
    displaySettings: adDisplaySettings,
  } = useAdvertisement();
  const { getFrameForType } = useFrame();

  // Merge projection settings with defaults to ensure all properties exist
  const settings = useMemo(
    () => ({
      ...defaultProjectionSettings,
      ...projectionSettings,
      textShadow: {
        ...defaultProjectionSettings.textShadow,
        ...projectionSettings.textShadow,
      },
      textOutline: {
        ...defaultProjectionSettings.textOutline,
        ...projectionSettings.textOutline,
      },
      textAlign: {
        ...defaultProjectionSettings.textAlign,
        ...projectionSettings.textAlign,
      },
      padding: {
        top:
          projectionSettings.padding?.top ??
          defaultProjectionSettings.padding!.top,
        bottom:
          projectionSettings.padding?.bottom ??
          defaultProjectionSettings.padding!.bottom,
        left:
          projectionSettings.padding?.left ??
          defaultProjectionSettings.padding!.left,
        right:
          projectionSettings.padding?.right ??
          defaultProjectionSettings.padding!.right,
      },
    }),
    [projectionSettings],
  );

  useFontLoader(detectedFonts);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.15);

  // Calculate preview scale based on available space (fit to both width and height)
  useLayoutEffect(() => {
    const calculateScale = () => {
      if (!wrapperRef.current) return;
      const wrapperWidth = wrapperRef.current.clientWidth;
      const wrapperHeight = wrapperRef.current.clientHeight;

      // Calculate scale to fit within available space while maintaining aspect ratio
      const scaleX = wrapperWidth / PROJECTION_WIDTH;
      const scaleY = wrapperHeight / PROJECTION_HEIGHT;
      const scale = Math.min(scaleX, scaleY);

      setPreviewScale(scale);
    };

    calculateScale();

    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver(calculateScale);
    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Get current lines for projection
  const currentLines = currentSlide?.lines ?? [];

  // Get current frame based on current item type
  const currentFrame = useMemo(() => {
    if (!currentItem) return null;
    return getFrameForType(currentItem.type);
  }, [currentItem, getFrameForType]);

  // Format font family for projection
  const formattedFontFamily =
    fontFamily && fontFamily !== 'inherit' ? `"${fontFamily}"` : 'inherit';

  // Calculate the actual scaled dimensions for proper centering
  const scaledDimensions = useMemo(
    () => ({
      width: PROJECTION_WIDTH * previewScale,
      height: PROJECTION_HEIGHT * previewScale,
    }),
    [previewScale],
  );

  // Memoize style object to prevent unnecessary re-renders
  const scaledContainerStyle = useMemo(
    () => ({
      transform: `scale(${previewScale})`,
      transformOrigin: 'top left' as const,
      width: PROJECTION_WIDTH,
      height: PROJECTION_HEIGHT,
    }),
    [previewScale],
  );

  return (
    <div className="flex flex-col h-full bg-card/30">
      {/* Header - standardized h-12 */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {t('livePreview')}
          </h2>
          {/* Current song/slide info inline */}
          {currentSong && (
            <span className="text-xs text-muted-foreground font-medium">
              {currentSong.title} · {presentationState.currentSlideIndex + 1}/
              {currentSong.slides.length}
            </span>
          )}
        </div>
        {isProjectionOpen && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            {t('live')}
          </span>
        )}
      </div>

      {/* Preview Container - fills available space, no padding */}
      <div
        ref={wrapperRef}
        className="flex-1 min-h-0 flex items-center justify-center bg-black"
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: scaledDimensions.width,
            height: scaledDimensions.height,
          }}
        >
          {/* Scaled projection content - uses exact same components as projection window */}
          <div
            className="absolute top-0 left-0 overflow-hidden"
            style={scaledContainerStyle}
          >
            <div className="relative w-full h-full overflow-hidden bg-black">
              <ProjectionRenderer
                videoPath={currentVideoPath}
                imagePath={currentImagePath}
                backgroundColor={backgroundColor}
                backgroundType={backgroundType}
                lines={currentLines}
                fontFamily={formattedFontFamily}
                settings={settings}
                isBlank={isBlank}
                isVerseHidden={isVerseHidden}
                isAdVisible={isAdVisible}
                currentAd={currentAd}
                adDisplaySettings={adDisplaySettings}
                frame={currentFrame}
                contentType={currentItem?.type}
                lineRoles={currentSlide?.lineRoles}
                contentTypeTextSettings={contentTypeTextSettings ?? undefined}
              />
            </div>
          </div>

          {/* Preview-specific overlays (not part of projection) */}

          {/* Verse hidden indicator - fades in when verse is hidden */}
          <div
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            style={{
              opacity: !isBlank && isVerseHidden ? 0.5 : 0,
              transition: 'opacity 300ms ease-in-out',
            }}
          >
            <p className="text-xs text-muted-foreground font-medium">
              {t('verseHidden')}
            </p>
          </div>

          {/* No content indicator */}
          {!currentSlide && !isBlank && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <p className="text-xs text-muted-foreground font-medium">
                {t('noContent')}
              </p>
            </div>
          )}

          {/* Projection status overlay */}
          {!isProjectionOpen && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 z-50">
              <MonitorOff className="w-6 h-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">
                {t('projectionClosed')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
