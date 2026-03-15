import { useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  EyeOff,
  Eye,
  EyeClosedIcon,
  Video,
  Image,
  Palette,
  ChevronDown,
  Shuffle,
  Undo2,
  Redo2,
  Pipette,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { basename } from '../../shared/utils/fileHelpers';
import { modKey, shiftKey } from '../../shared/utils/platform';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../../components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  useSetlist,
  usePresentation,
  useProjection,
  useMedia,
  useUndo,
} from '../context';
import { cn } from '../../lib/utils';

export default function ControlPanel() {
  const { t } = useTranslation();
  const { currentSetlist } = useSetlist();
  const {
    currentItemSlides,
    presentationState,
    nextSlide,
    prevSlide,
    nextSong,
    prevSong,
  } = usePresentation();
  const { isBlank, isVerseHidden, toggleBlank, toggleVerseHidden } =
    useProjection();
  const {
    backgroundType,
    setBackgroundType,
    embeddedVideos,
    currentVideoPath,
    selectVideo,
    isVideoShuffleEnabled,
    toggleVideoShuffle,
    availableImages,
    currentImagePath,
    selectImage,
    backgroundColor,
  } = useMedia();
  const { canUndo, canRedo, undo, redo } = useUndo();
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleUndo = () => {
    if (canUndo) undo();
  };

  const handleRedo = () => {
    if (canRedo) redo();
  };

  const handlePrevSlide = () => prevSlide();
  const handleNextSlide = () => nextSlide();
  const handlePrevSong = () => prevSong();
  const handleNextSong = () => nextSong();

  // Use unified item slides for navigation (works for songs, bible, announcements)
  const canNavigate = currentItemSlides.length > 0;

  // Memoized disabled states to prevent unnecessary re-renders
  const isPrevDisabled = useMemo(
    () =>
      !canNavigate ||
      (presentationState.currentSlideIndex === 0 &&
        presentationState.currentSongIndex === 0),
    [
      canNavigate,
      presentationState.currentSlideIndex,
      presentationState.currentSongIndex,
    ],
  );

  const isNextDisabled = useMemo(
    () =>
      !canNavigate ||
      (presentationState.currentSlideIndex >= currentItemSlides.length - 1 &&
        presentationState.currentSongIndex >=
          (currentSetlist?.items.length ?? 0) - 1),
    [
      canNavigate,
      presentationState.currentSlideIndex,
      presentationState.currentSongIndex,
      currentItemSlides.length,
      currentSetlist?.items.length,
    ],
  );

  const isPrevSongDisabled = presentationState.currentSongIndex === 0;
  const isNextSongDisabled =
    presentationState.currentSongIndex >=
    (currentSetlist?.items.length ?? 0) - 1;

  // Get the current background display name
  const getBackgroundDisplayName = () => {
    if (backgroundType === 'video') {
      return (
        (currentVideoPath ? basename(currentVideoPath) : null) ||
        t('selectVideo')
      );
    }
    if (backgroundType === 'image') {
      return (
        (currentImagePath ? basename(currentImagePath) : null) ||
        t('selectImage')
      );
    }
    // Color
    const colorName = {
      '#000000': t('colorBlack'),
      '#FFFFFF': t('colorWhite'),
      '#00FF00': t('colorGreen'),
      '#0000FF': t('colorBlue'),
    }[backgroundColor];
    return colorName || backgroundColor;
  };

  const currentBackgroundName = getBackgroundDisplayName();

  // Get icon for current background type
  const BackgroundIcon =
    backgroundType === 'video'
      ? Video
      : backgroundType === 'image'
        ? Image
        : Palette;

  return (
    <TooltipProvider>
      <div className="h-16 px-4 border-t border-border bg-card/50 flex items-center gap-4 flex-shrink-0 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                disabled={!canUndo}
                className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={`${t('undo')} (${modKey}Z)`}
                data-testid="btn-undo"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>
                {t('undo')} ({modKey}Z)
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                disabled={!canRedo}
                className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={`${t('redo')} (${modKey}${shiftKey}Z)`}
                data-testid="btn-redo"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>
                {t('redo')} ({modKey}
                {shiftKey}Z)
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Slide Navigation */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevSlide}
                disabled={isPrevDisabled}
                className="h-10 w-10 bg-muted border-border disabled:opacity-40"
                aria-label={`${t('prev')} (←)`}
                data-testid="btn-prev-slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('prev')} (←)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextSlide}
                disabled={isNextDisabled}
                className="h-10 w-10 bg-muted border-border disabled:opacity-40"
                aria-label={`${t('next')} (→)`}
                data-testid="btn-next-slide"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('next')} (→)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Song Navigation */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevSong}
                disabled={isPrevSongDisabled}
                className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={`${t('prevSong')} (↑)`}
                data-testid="btn-prev-song"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('prevSong')} (↑)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextSong}
                disabled={isNextSongDisabled}
                className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={`${t('nextSong')} (↓)`}
                data-testid="btn-next-song"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('nextSong')} (↓)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Display Controls */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={toggleBlank}
                className={cn(
                  'h-10 gap-2 px-4 font-medium transition-all',
                  isBlank
                    ? 'bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-200 hover:bg-red-500/30'
                    : 'bg-muted border-border text-foreground hover:bg-accent',
                )}
                aria-label={
                  isBlank ? `${t('showScreen')} (B)` : `${t('blankScreen')} (B)`
                }
                aria-pressed={isBlank}
                data-testid="btn-blank"
              >
                {isBlank ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                <span className="text-xs">
                  {isBlank ? t('show') : t('blank')}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isBlank ? t('showScreen') : t('blankScreen')} (B)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleVerseHidden}
                disabled={isBlank}
                className={cn(
                  'h-10 w-10 transition-all',
                  isVerseHidden
                    ? 'bg-active border-active-border-subtle text-active-foreground'
                    : 'bg-muted border-border text-foreground hover:bg-accent',
                  isBlank && 'opacity-40',
                )}
                aria-label={
                  isVerseHidden
                    ? `${t('showVerse')} (V)`
                    : `${t('hideVerse')} (V)`
                }
                aria-pressed={isVerseHidden}
                data-testid="btn-verse-hide"
              >
                {isVerseHidden ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeClosedIcon className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isVerseHidden ? t('showVerse') : t('hideVerse')} (V)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Background Selector */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 px-3 max-w-[200px] bg-muted border-border"
                    data-testid="bg-selector"
                  >
                    <BackgroundIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-xs truncate">
                      {currentBackgroundName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{t('background')}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-64">
              {/* Videos Section */}
              <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
                <Video className="w-3.5 h-3.5" />
                {t('videos')}
              </DropdownMenuLabel>
              {embeddedVideos.length === 0 ? (
                <div className="px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t('noVideosFound')}
                  </p>
                </div>
              ) : (
                embeddedVideos.map((videoPath) => {
                  const filename = basename(videoPath);
                  const isSelected =
                    backgroundType === 'video' &&
                    currentVideoPath === videoPath;
                  return (
                    <DropdownMenuItem
                      key={videoPath}
                      onClick={() => {
                        selectVideo(videoPath);
                        setBackgroundType('video');
                      }}
                      className={cn(
                        'gap-2 cursor-pointer',
                        isSelected && 'bg-active text-active-foreground',
                      )}
                    >
                      <Video className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs truncate flex-1">
                        {filename}
                      </span>
                    </DropdownMenuItem>
                  );
                })
              )}

              <DropdownMenuSeparator />

              {/* Images Section */}
              <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
                <Image className="w-3.5 h-3.5" />
                {t('images')}
              </DropdownMenuLabel>
              {availableImages.length === 0 ? (
                <div className="px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t('noImagesFound')}
                  </p>
                </div>
              ) : (
                availableImages.map((imagePath) => {
                  const filename = basename(imagePath);
                  const isSelected =
                    backgroundType === 'image' &&
                    currentImagePath === imagePath;
                  return (
                    <DropdownMenuItem
                      key={imagePath}
                      onClick={() => {
                        selectImage(imagePath);
                        setBackgroundType('image');
                      }}
                      className={cn(
                        'gap-2 cursor-pointer',
                        isSelected && 'bg-active text-active-foreground',
                      )}
                    >
                      <Image className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs truncate flex-1">
                        {filename}
                      </span>
                    </DropdownMenuItem>
                  );
                })
              )}

              <DropdownMenuSeparator />

              {/* Colors Section */}
              <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
                <Palette className="w-3.5 h-3.5" />
                {t('colors')}
              </DropdownMenuLabel>
              {[
                { color: '#000000', name: t('colorBlack') },
                { color: '#FFFFFF', name: t('colorWhite') },
                { color: '#00FF00', name: t('colorGreen') },
                { color: '#0000FF', name: t('colorBlue') },
              ].map(({ color, name }) => {
                const isSelected =
                  backgroundType === 'color' && backgroundColor === color;
                return (
                  <DropdownMenuItem
                    key={color}
                    onClick={() => {
                      setBackgroundType('color', color);
                    }}
                    className={cn(
                      'gap-2 cursor-pointer',
                      isSelected && 'bg-active text-active-foreground',
                    )}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-sm border border-border flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs truncate flex-1">{name}</span>
                  </DropdownMenuItem>
                );
              })}

              {/* Custom Color Picker */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  colorInputRef.current?.click();
                }}
                className="gap-2 cursor-pointer"
              >
                <Pipette className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs truncate flex-1">
                  {t('customColor')}
                </span>
                {backgroundType === 'color' &&
                  !['#000000', '#FFFFFF', '#00FF00', '#0000FF'].includes(
                    backgroundColor,
                  ) && (
                    <div
                      className="w-3.5 h-3.5 rounded-sm border border-border flex-shrink-0"
                      style={{ backgroundColor }}
                    />
                  )}
              </DropdownMenuItem>

              {/* Hidden color input */}
              <input
                ref={colorInputRef}
                type="color"
                value={backgroundColor}
                onChange={(e) => {
                  setBackgroundType('color', e.target.value);
                }}
                className="sr-only"
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isVideoShuffleEnabled ? 'default' : 'ghost'}
                size="icon"
                onClick={toggleVideoShuffle}
                disabled={
                  backgroundType !== 'video' || embeddedVideos.length <= 1
                }
                className={cn(
                  'h-10 w-10 transition-all disabled:opacity-40',
                  isVideoShuffleEnabled && backgroundType === 'video'
                    ? 'bg-active text-active-foreground hover:bg-active-hover'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={
                  isVideoShuffleEnabled ? t('shuffleOn') : t('shuffleOff')
                }
                aria-pressed={
                  isVideoShuffleEnabled && backgroundType === 'video'
                }
              >
                <Shuffle className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isVideoShuffleEnabled ? t('shuffleOn') : t('shuffleOff')}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Shortcuts hint */}
        <div className="text-[10px] text-muted-foreground font-medium whitespace-nowrap flex-shrink-0">
          <span className="font-bold">← →</span> {t('slide')} ·{' '}
          <span className="font-bold">↑ ↓</span> {t('song')} ·{' '}
          <span className="font-bold">B</span> {t('blank')} ·{' '}
          <span className="font-bold">{modKey}Z</span> {t('undo')}
        </div>
      </div>
    </TooltipProvider>
  );
}
