import { useEffect, useCallback } from 'react';
import { usePresentation, useProjection } from '../context';

export function useKeyboardShortcuts() {
  const {
    currentSong,
    nextSlide,
    prevSlide,
    nextSong,
    prevSong,
    goToSlide,
    goToSection,
    goToNextSection,
    goToPreviousSection,
    getSectionIndices,
  } = usePresentation();

  const { toggleBlank, toggleVerseHidden } = useProjection();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Number keys 1-9 to jump to sections (or slides if no sections)
      if (event.key >= '1' && event.key <= '9') {
        const sectionIndex = parseInt(event.key, 10) - 1;
        const sectionIndices = getSectionIndices();
        if (sectionIndex < sectionIndices.length) {
          event.preventDefault();
          goToSection(sectionIndex);
        }
        return;
      }

      switch (event.key) {
        case ' ':
        case 'ArrowRight':
          event.preventDefault();
          nextSlide();
          break;

        case 'ArrowLeft':
          event.preventDefault();
          prevSlide();
          break;

        case 'ArrowDown':
          event.preventDefault();
          nextSong();
          break;

        case 'ArrowUp':
          event.preventDefault();
          prevSong();
          break;

        case 'Tab':
          event.preventDefault();
          if (event.shiftKey) {
            goToPreviousSection();
          } else {
            goToNextSection();
          }
          break;

        case 'Home':
          event.preventDefault();
          goToSlide(0);
          break;

        case 'End':
          event.preventDefault();
          if (currentSong && currentSong.slides.length > 0) {
            goToSlide(currentSong.slides.length - 1);
          }
          break;

        case 'b':
        case 'B':
        case '.':
        case 'Escape':
          event.preventDefault();
          toggleBlank();
          break;

        case 'v':
        case 'V':
          event.preventDefault();
          toggleVerseHidden();
          break;

        default:
          break;
      }
    },
    [
      nextSlide,
      prevSlide,
      nextSong,
      prevSong,
      toggleBlank,
      toggleVerseHidden,
      goToSection,
      goToNextSection,
      goToPreviousSection,
      goToSlide,
      getSectionIndices,
      currentSong,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
