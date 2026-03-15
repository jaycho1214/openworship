import { useEffect, useCallback, useRef } from 'react';
import { usePresentation, useProjection, useUndo } from '../context';

export function useKeyboardShortcuts() {
  const {
    currentItemSlides,
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
  const { canUndo, canRedo, undo, redo } = useUndo();

  const currentItemSlidesRef = useRef(currentItemSlides);
  currentItemSlidesRef.current = currentItemSlides;

  const handleUndo = useCallback(() => {
    if (canUndo) undo();
  }, [canUndo, undo]);

  const handleRedo = useCallback(() => {
    if (canRedo) redo();
  }, [canRedo, redo]);

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

      // Don't trigger shortcuts when a dialog/sheet/alert-dialog is open
      // Let Radix UI handle ESC key for closing dialogs
      const dialogOpen = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
      );
      if (dialogOpen) {
        return;
      }

      // Undo/Redo shortcuts (Cmd+Z / Cmd+Shift+Z)
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      // Ctrl+Y redo (Windows convention)
      if (event.ctrlKey && !event.metaKey && event.key === 'y') {
        event.preventDefault();
        handleRedo();
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

        case 'End': {
          event.preventDefault();
          const slides = currentItemSlidesRef.current;
          if (slides && slides.length > 0) {
            goToSlide(slides.length - 1);
          }
          break;
        }

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

        case 'b':
        case 'B':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            toggleBlank();
          }
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
      handleUndo,
      handleRedo,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
