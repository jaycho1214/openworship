import { useMemo } from 'react';
import { usePresentation } from '../context';
import { cn } from '../../lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

// Abbreviate section names for display
function abbreviateSection(section: string): string {
  const lower = section.toLowerCase();

  // Common section abbreviations
  if (lower.includes('verse') || lower.includes('절')) {
    const num = section.match(/\d+/)?.[0] || '';
    return `V${num}`;
  }
  if (lower.includes('chorus') || lower.includes('후렴')) {
    const num = section.match(/\d+/)?.[0] || '';
    return num ? `C${num}` : 'C';
  }
  if (lower.includes('bridge') || lower.includes('브릿지')) {
    return 'B';
  }
  if (lower.includes('intro') || lower.includes('인트로')) {
    return 'I';
  }
  if (lower.includes('outro') || lower.includes('아웃트로')) {
    return 'O';
  }
  if (lower.includes('pre-chorus') || lower.includes('프리코러스')) {
    return 'PC';
  }
  if (lower.includes('interlude') || lower.includes('간주')) {
    return 'Int';
  }

  // Fallback: first 2-3 chars
  return section.slice(0, 3);
}

interface SectionInfo {
  name: string;
  abbreviation: string;
  slideIndex: number;
  firstLine: string;
}

export default function SectionTimeline() {
  const { currentSong, presentationState, goToSlide, getSectionIndices } =
    usePresentation();

  // Build section info from current song
  const sections = useMemo((): SectionInfo[] => {
    if (!currentSong) return [];

    const sectionIndices = getSectionIndices();
    const result: SectionInfo[] = [];

    sectionIndices.forEach((slideIndex) => {
      const slide = currentSong.slides[slideIndex];
      if (slide?.section) {
        result.push({
          name: slide.section,
          abbreviation: abbreviateSection(slide.section),
          slideIndex,
          firstLine: slide.lines[0] || '',
        });
      }
    });

    return result;
  }, [currentSong, getSectionIndices]);

  // Find current section based on current slide
  const currentSectionIndex = useMemo(() => {
    if (!currentSong || sections.length === 0) return -1;

    const { currentSlideIndex } = presentationState;

    // Find the section that contains the current slide
    for (let i = sections.length - 1; i >= 0; i--) {
      if (currentSlideIndex >= sections[i].slideIndex) {
        return i;
      }
    }

    return -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- presentationState is accessed via currentSlideIndex
  }, [currentSong, sections, presentationState.currentSlideIndex]);

  // Don't render if no song or no sections
  if (!currentSong || sections.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-b border-border bg-card/30">
      {/* Section pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <TooltipProvider delayDuration={200}>
          {sections.map((section, index) => {
            const isActive = index === currentSectionIndex;
            const keyNumber = index < 9 ? index + 1 : null;

            return (
              <Tooltip key={`${section.name}-${section.slideIndex}`}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => goToSlide(section.slideIndex)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-md transition-all duration-150',
                      'min-w-[36px]',
                      'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                      isActive
                        ? 'bg-foreground text-background shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {/* Number is prominent */}
                    <span className="text-base font-bold leading-none">
                      {keyNumber ?? index + 1}
                    </span>
                    {/* Abbreviation is secondary */}
                    <span
                      className={cn(
                        'text-[9px] font-medium uppercase tracking-wide',
                        isActive
                          ? 'text-background/70'
                          : 'text-muted-foreground/70',
                      )}
                    >
                      {section.abbreviation}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="font-semibold">{section.name}</p>
                  {section.firstLine && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {section.firstLine}
                    </p>
                  )}
                  {keyNumber && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Press{' '}
                      <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">
                        {keyNumber}
                      </kbd>{' '}
                      to jump
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Current section indicator */}
      {currentSectionIndex >= 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Current:</span>
          <span className="font-semibold text-foreground">
            {sections[currentSectionIndex].name}
          </span>
        </div>
      )}
    </div>
  );
}
