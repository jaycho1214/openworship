import { useEffect, useCallback, useRef } from 'react';
import { usePresentation, useProjection, useUndo } from '../context';
import { Song } from '../../shared/types/song';

export function useKeyboardShortcuts() {
  const {
    currentSong,
    currentItemIndex,
    presentationState,
    nextSlide,
    prevSlide,
    nextSong,
    prevSong,
    goToSlide,
    goToSection,
    goToNextSection,
    goToPreviousSection,
    getSectionIndices,
    goToItem,
  } = usePresentation();

  const { toggleBlank, toggleVerseHidden, isBlank, isVerseHidden } =
    useProjection();
  const { canUndo, canRedo, undo, redo, pushState } = useUndo();

  // Use ref to avoid recreating handler when currentSong changes
  const currentSongRef = useRef<Song | null>(currentSong);
  currentSongRef.current = currentSong;

  // Push current state to undo stack when navigation happens
  const pushCurrentState = useCallback(() => {
    pushState({
      itemIndex: currentItemIndex,
      slideIndex: presentationState.currentSlideIndex,
      isBlank,
      isVerseHidden,
    });
  }, [
    pushState,
    currentItemIndex,
    presentationState.currentSlideIndex,
    isBlank,
    isVerseHidden,
  ]);

  // Handle undo action
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const state = undo();
    if (state) {
      goToItem(state.itemIndex, state.slideIndex);
    }
  }, [canUndo, undo, goToItem]);

  // Handle redo action
  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const state = redo();
    if (state) {
      goToItem(state.itemIndex, state.slideIndex);
    }
  }, [canRedo, redo, goToItem]);

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

      // Number keys 1-9 to jump to sections (or slides if no sections)
      if (event.key >= '1' && event.key <= '9') {
        const sectionIndex = parseInt(event.key, 10) - 1;
        const sectionIndices = getSectionIndices();
        if (sectionIndex < sectionIndices.length) {
          event.preventDefault();
          pushCurrentState();
          goToSection(sectionIndex);
        }
        return;
      }

      switch (event.key) {
        case ' ':
        case 'ArrowRight':
          event.preventDefault();
          pushCurrentState();
          nextSlide();
          break;

        case 'ArrowLeft':
          event.preventDefault();
          pushCurrentState();
          prevSlide();
          break;

        case 'ArrowDown':
          event.preventDefault();
          pushCurrentState();
          nextSong();
          break;

        case 'ArrowUp':
          event.preventDefault();
          pushCurrentState();
          prevSong();
          break;

        case 'Tab':
          event.preventDefault();
          pushCurrentState();
          if (event.shiftKey) {
            goToPreviousSection();
          } else {
            goToNextSection();
          }
          break;

        case 'Home':
          event.preventDefault();
          pushCurrentState();
          goToSlide(0);
          break;

        case 'End': {
          event.preventDefault();
          pushCurrentState();
          // Use ref to access currentSong without adding to deps
          const song = currentSongRef.current;
          if (song && song.slides.length > 0) {
            goToSlide(song.slides.length - 1);
          }
          break;
        }

        case '.':
        case 'Escape':
          event.preventDefault();
          pushCurrentState();
          toggleBlank();
          break;

        case 'v':
        case 'V':
          event.preventDefault();
          pushCurrentState();
          toggleVerseHidden();
          break;

        case 'b':
        case 'B':
          // Allow 'B' to also toggle blank (common shortcut)
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            pushCurrentState();
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
      pushCurrentState,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
