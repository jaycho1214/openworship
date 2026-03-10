import VideoBackground from './VideoBackground';
import LyricsOverlay from './LyricsOverlay';
import BlankScreen from './BlankScreen';
import AdvertisementOverlay from './AdvertisementOverlay';
import NoteOverlay from './NoteOverlay';
import type {
  ProjectionSettings,
  SlideOverrides,
} from '../../shared/types/song';
import type { BackgroundType, Advertisement } from '../../../shared/types';
import type { AdvertisementDisplaySettings } from '../../../shared/types/advertisement';
import type { Frame } from '../../../shared/types/frame';
import type { ContentTypeTextSettings } from '../../../shared/types/settings';
import type { SetlistItemType } from '../../../shared/types/setlistItem';

interface ProjectionRendererProps {
  // Background
  videoPath: string | null;
  imagePath: string | null;
  backgroundColor: string;
  backgroundType: BackgroundType;

  // Lyrics
  lines: string[];
  fontFamily: string;
  settings: ProjectionSettings;
  slideFontSize?: number; // Per-slide font size override
  slideOverrides?: SlideOverrides; // Per-slide overrides (position, padding, etc.)

  // State
  isBlank: boolean;
  isVerseHidden: boolean;

  // Advertisement
  isAdVisible: boolean;
  currentAd: Advertisement | null;
  adDisplaySettings: AdvertisementDisplaySettings;

  // Frame
  frame?: Frame | null;

  // Content type text settings
  contentType?: SetlistItemType;
  lineRoles?: ('body' | 'reference')[];
  contentTypeTextSettings?: ContentTypeTextSettings;

  // Overlay note
  isOverlayNoteVisible?: boolean;
  overlayNoteContent?: string;
  overlayNoteContentType?: 'text' | 'image';
  overlayNoteImagePath?: string;
  overlayNotePosition?: 'top' | 'bottom';
}

export default function ProjectionRenderer({
  videoPath,
  imagePath,
  backgroundColor,
  backgroundType,
  lines,
  fontFamily,
  settings,
  slideFontSize,
  slideOverrides,
  isBlank,
  isVerseHidden,
  isAdVisible,
  currentAd,
  adDisplaySettings,
  frame = null,
  contentType,
  lineRoles,
  contentTypeTextSettings,
  isOverlayNoteVisible = false,
  overlayNoteContent,
  overlayNoteContentType,
  overlayNoteImagePath,
  overlayNotePosition,
}: ProjectionRendererProps) {
  return (
    <>
      {/* Background Layer */}
      <VideoBackground
        videoPath={videoPath}
        imagePath={imagePath}
        backgroundColor={backgroundColor}
        backgroundType={backgroundType}
        crossfadeDuration={1000}
      />

      {/* Background Dim Overlay */}
      {settings.backgroundDim > 0 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none z-[5]"
          style={{ opacity: settings.backgroundDim / 100 }}
        />
      )}

      {/* Lyrics Overlay - always rendered; BlankScreen (z-50) covers it visually */}
      <LyricsOverlay
        lines={lines}
        fontFamily={fontFamily}
        settings={settings}
        slideFontSize={slideFontSize}
        slideOverrides={slideOverrides}
        isHidden={isVerseHidden}
        isBannerAdVisible={isAdVisible && currentAd?.displayStyle === 'banner'}
        bannerAdPosition={adDisplaySettings.position}
        bannerAdPadding={adDisplaySettings.padding}
        bannerAdFontSize={currentAd?.fontSize}
        isOverlayNoteVisible={isOverlayNoteVisible}
        overlayNotePosition={overlayNotePosition}
        frame={frame}
        contentType={contentType}
        lineRoles={lineRoles}
        contentTypeTextSettings={contentTypeTextSettings}
      />

      {/* Note Overlay */}
      <NoteOverlay
        isVisible={isOverlayNoteVisible}
        content={overlayNoteContent}
        contentType={overlayNoteContentType}
        imagePath={overlayNoteImagePath}
        position={overlayNotePosition}
      />

      {/* Advertisement Overlay */}
      <AdvertisementOverlay
        isVisible={isAdVisible}
        advertisement={currentAd}
        displaySettings={adDisplaySettings}
      />

      {/* Blank Screen Overlay */}
      <BlankScreen isBlank={isBlank} />
    </>
  );
}
