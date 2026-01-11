import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  EyeOff,
  Eye,
  EyeClosedIcon,
  Video,
  ChevronDown,
  Shuffle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
} from '../context';
import { cn } from '../../lib/utils';

export default function ControlPanel() {
  const { t } = useTranslation();
  const { currentSetlist } = useSetlist();
  const {
    currentSong,
    presentationState,
    nextSlide,
    prevSlide,
    nextSong,
    prevSong,
  } = usePresentation();
  const { isBlank, isVerseHidden, toggleBlank, toggleVerseHidden } =
    useProjection();
  const {
    embeddedVideos,
    currentVideoPath,
    selectVideo,
    isVideoShuffleEnabled,
    toggleVideoShuffle,
  } = useMedia();

  const canNavigate = currentSong && currentSong.slides.length > 0;
  const currentVideoName =
    currentVideoPath?.split('/').pop() || t('selectVideo');

  return (
    <TooltipProvider>
      <div className="h-16 px-4 border-t border-border bg-card/50 flex items-center gap-4 flex-shrink-0">
        {/* Slide Navigation */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={prevSlide}
                disabled={
                  !canNavigate ||
                  (presentationState.currentSlideIndex === 0 &&
                    presentationState.currentSongIndex === 0)
                }
                className="h-10 w-10 bg-muted border-border disabled:opacity-40"
                aria-label={`${t('prev')} (←)`}
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
                onClick={nextSlide}
                disabled={
                  !canNavigate ||
                  (presentationState.currentSlideIndex >=
                    (currentSong?.slides.length ?? 0) - 1 &&
                    presentationState.currentSongIndex >=
                      (currentSetlist?.songs.length ?? 0) - 1)
                }
                className="h-10 w-10 bg-muted border-border disabled:opacity-40"
                aria-label={`${t('next')} (→)`}
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
                onClick={prevSong}
                disabled={presentationState.currentSongIndex === 0}
                className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={`${t('prevSong')} (↑)`}
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
                onClick={nextSong}
                disabled={
                  presentationState.currentSongIndex >=
                  (currentSetlist?.songs.length ?? 0) - 1
                }
                className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={`${t('nextSong')} (↓)`}
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
                    ? 'bg-red-500/25 border-red-500/50 text-red-700 dark:text-red-200 hover:bg-red-500/35'
                    : 'bg-muted border-border text-foreground hover:bg-accent',
                )}
                aria-label={
                  isBlank ? `${t('showScreen')} (B)` : `${t('blankScreen')} (B)`
                }
                aria-pressed={isBlank}
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

        {/* Video Selector */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 px-3 max-w-[200px] bg-muted border-border"
                  >
                    <Video className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-xs truncate">{currentVideoName}</span>
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{t('backgroundVideo')}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-64">
              {embeddedVideos.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t('noVideosFound')}
                  </p>
                </div>
              ) : (
                embeddedVideos.map((videoPath) => {
                  const filename = videoPath.split('/').pop() || videoPath;
                  const isSelected = currentVideoPath === videoPath;
                  return (
                    <DropdownMenuItem
                      key={videoPath}
                      onClick={() => selectVideo(videoPath)}
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
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isVideoShuffleEnabled ? 'default' : 'ghost'}
                size="icon"
                onClick={toggleVideoShuffle}
                disabled={embeddedVideos.length <= 1}
                className={cn(
                  'h-10 w-10 transition-all disabled:opacity-40',
                  isVideoShuffleEnabled
                    ? 'bg-active text-active-foreground hover:bg-active-hover'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={
                  isVideoShuffleEnabled ? t('shuffleOn') : t('shuffleOff')
                }
                aria-pressed={isVideoShuffleEnabled}
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
        <div className="text-[10px] text-muted-foreground font-medium hidden lg:block">
          <span className="font-bold">← →</span> {t('slide')} ·{' '}
          <span className="font-bold">↑ ↓</span> {t('song')} ·{' '}
          <span className="font-bold">B</span> {t('blank')}
        </div>
      </div>
    </TooltipProvider>
  );
}
