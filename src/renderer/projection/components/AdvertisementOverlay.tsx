import {
  Advertisement,
  AdvertisementDisplaySettings,
  AdvertisementPosition,
  DEFAULT_DISPLAY_SETTINGS,
} from '../../../shared/types/advertisement';

interface AdvertisementOverlayProps {
  isVisible: boolean;
  advertisement: Advertisement | null;
  displaySettings: AdvertisementDisplaySettings;
}

// Helper to get background color with transparency support
function getBackgroundColor(settings: AdvertisementDisplaySettings): string {
  if (settings.backgroundTransparent) return 'transparent';
  return settings.backgroundColor || '#000000';
}

// Helper to get padding style from global settings
function getPaddingStyle(settings: AdvertisementDisplaySettings): string {
  const { top, right, bottom, left } = settings.padding;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

// Helper to get position styles for banner mode
function getBannerPositionStyles(
  isVisible: boolean,
  position: AdvertisementPosition = 'bottom',
): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out',
  };

  switch (position) {
    case 'top':
      return {
        ...baseStyles,
        top: 0,
        bottom: 'auto',
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
      };
    case 'middle':
      return {
        ...baseStyles,
        top: '50%',
        bottom: 'auto',
        transform: isVisible
          ? 'translateY(-50%)'
          : 'translateY(-50%) scale(0.95)',
        opacity: isVisible ? 1 : 0,
      };
    case 'bottom':
    default:
      return {
        ...baseStyles,
        bottom: 0,
        top: 'auto',
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
      };
  }
}

// Helper to get alignment styles for fullscreen mode based on position
function getFullscreenAlignmentStyles(
  position: AdvertisementPosition = 'middle',
): React.CSSProperties {
  switch (position) {
    case 'top':
      return { alignItems: 'flex-start', justifyContent: 'center' };
    case 'bottom':
      return { alignItems: 'flex-end', justifyContent: 'center' };
    case 'middle':
    default:
      return { alignItems: 'center', justifyContent: 'center' };
  }
}

export default function AdvertisementOverlay({
  isVisible,
  advertisement,
  displaySettings = DEFAULT_DISPLAY_SETTINGS,
}: AdvertisementOverlayProps) {
  const isFullscreen = advertisement?.displayStyle === 'fullscreen';
  const isBanner = advertisement?.displayStyle === 'banner';
  const position = displaySettings.position || (isBanner ? 'bottom' : 'middle');
  const padding = getPaddingStyle(displaySettings);
  const backgroundColor = getBackgroundColor(displaySettings);

  return (
    <>
      {/* Fullscreen overlay */}
      <div
        className="absolute inset-0 z-40 pointer-events-none flex"
        style={{
          opacity: isVisible && isFullscreen ? 1 : 0,
          transition: 'opacity 300ms ease-in-out',
          backgroundColor,
          padding,
          ...getFullscreenAlignmentStyles(position),
        }}
      >
        {advertisement?.type === 'text' ? (
          <div
            className="text-center max-w-[90%]"
            style={{
              color: advertisement?.textColor || '#ffffff',
              fontSize: `${advertisement?.fontSize || 48}px`,
              fontWeight: 'bold',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
            }}
          >
            {advertisement?.content}
          </div>
        ) : advertisement?.type === 'image' ? (
          <img
            src={`file://${advertisement?.content}`}
            alt="Advertisement"
            className="max-w-full max-h-full object-contain"
            style={{
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
            }}
          />
        ) : null}
      </div>

      {/* Banner overlay */}
      <div
        className="absolute left-0 right-0 z-40 pointer-events-none"
        style={{
          opacity: isVisible && isBanner ? 1 : 0,
          backgroundColor,
          ...getBannerPositionStyles(isVisible && isBanner, position),
        }}
      >
        {advertisement?.type === 'text' ? (
          <div
            className="text-center"
            style={{
              color: advertisement?.textColor || '#ffffff',
              fontSize: `${advertisement?.fontSize || 36}px`,
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              padding,
            }}
          >
            {advertisement?.content}
          </div>
        ) : advertisement?.type === 'image' ? (
          <div style={{ padding, textAlign: 'center' }}>
            <img
              src={`file://${advertisement?.content}`}
              alt="Advertisement"
              className="max-h-[200px] object-contain"
              style={{
                filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4))',
              }}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
