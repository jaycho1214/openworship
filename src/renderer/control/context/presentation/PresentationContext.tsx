import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { Song, Slide, PresentationState } from '../../../shared/types/song';
import { useSetlist } from '../setlist/SetlistContext';

interface PresentationContextType {
  presentationState: PresentationState;
  currentSong: Song | null;
  currentSlide: Slide | null;
  nextSlide: () => void;
  prevSlide: () => void;
  nextSong: () => void;
  prevSong: () => void;
  goToSong: (index: number) => void;
  goToSlide: (index: number) => void;
  goToPosition: (songIndex: number, slideIndex: number) => void;
  goToSection: (sectionIndex: number) => void;
  goToNextSection: () => void;
  goToPreviousSection: () => void;
  getCurrentSection: () => { name: string; index: number } | null;
  getSectionIndices: () => number[];
  resetPosition: () => void;
}

const PresentationContext = createContext<PresentationContextType | null>(null);

export function usePresentation() {
  const context = useContext(PresentationContext);
  if (!context) {
    throw new Error(
      'usePresentation must be used within a PresentationProvider',
    );
  }
  return context;
}

interface PresentationProviderProps {
  children: ReactNode;
}

export function PresentationProvider({ children }: PresentationProviderProps) {
  const { currentSetlist } = useSetlist();

  const [presentationState, setPresentationState] = useState<PresentationState>(
    {
      currentSongIndex: 0,
      currentSlideIndex: 0,
      isBlank: false,
      isVerseHidden: false,
      currentVideoPath: null,
    },
  );

  const currentSong = useMemo(
    () => currentSetlist?.songs[presentationState.currentSongIndex] ?? null,
    [currentSetlist, presentationState.currentSongIndex],
  );

  const currentSlide = useMemo(
    () => currentSong?.slides[presentationState.currentSlideIndex] ?? null,
    [currentSong, presentationState.currentSlideIndex],
  );

  const resetPosition = useCallback(() => {
    setPresentationState((prev) => ({
      ...prev,
      currentSongIndex: 0,
      currentSlideIndex: 0,
    }));
  }, []);

  const nextSlide = useCallback(() => {
    if (!currentSong || !currentSetlist) return;

    setPresentationState((prev) => {
      if (prev.currentSlideIndex < currentSong.slides.length - 1) {
        return { ...prev, currentSlideIndex: prev.currentSlideIndex + 1 };
      }
      if (prev.currentSongIndex < currentSetlist.songs.length - 1) {
        return {
          ...prev,
          currentSongIndex: prev.currentSongIndex + 1,
          currentSlideIndex: 0,
        };
      }
      return prev;
    });
  }, [currentSong, currentSetlist]);

  const prevSlide = useCallback(() => {
    if (!currentSetlist) return;

    setPresentationState((prev) => {
      if (prev.currentSlideIndex > 0) {
        return { ...prev, currentSlideIndex: prev.currentSlideIndex - 1 };
      }
      if (prev.currentSongIndex > 0) {
        const prevSong = currentSetlist.songs[prev.currentSongIndex - 1];
        return {
          ...prev,
          currentSongIndex: prev.currentSongIndex - 1,
          currentSlideIndex: prevSong.slides.length - 1,
        };
      }
      return prev;
    });
  }, [currentSetlist]);

  const nextSong = useCallback(() => {
    if (!currentSetlist) return;

    setPresentationState((prev) => {
      if (prev.currentSongIndex < currentSetlist.songs.length - 1) {
        return {
          ...prev,
          currentSongIndex: prev.currentSongIndex + 1,
          currentSlideIndex: 0,
        };
      }
      return prev;
    });
  }, [currentSetlist]);

  const prevSong = useCallback(() => {
    setPresentationState((prev) => {
      if (prev.currentSongIndex > 0) {
        return {
          ...prev,
          currentSongIndex: prev.currentSongIndex - 1,
          currentSlideIndex: 0,
        };
      }
      return prev;
    });
  }, []);

  const goToSong = useCallback((index: number) => {
    setPresentationState((prev) => ({
      ...prev,
      currentSongIndex: index,
      currentSlideIndex: 0,
    }));
  }, []);

  const goToSlide = useCallback((index: number) => {
    setPresentationState((prev) => ({
      ...prev,
      currentSlideIndex: index,
    }));
  }, []);

  const goToPosition = useCallback((songIndex: number, slideIndex: number) => {
    setPresentationState((prev) => ({
      ...prev,
      currentSongIndex: songIndex,
      currentSlideIndex: slideIndex,
    }));
  }, []);

  const getSectionIndices = useCallback((): number[] => {
    if (!currentSong) return [];
    const indices: number[] = [];
    currentSong.slides.forEach((slide, index) => {
      if (slide.section) {
        indices.push(index);
      }
    });
    if (indices.length === 0) {
      return currentSong.slides.map((_, i) => i).slice(0, 9);
    }
    return indices;
  }, [currentSong]);

  const goToSection = useCallback(
    (sectionIndex: number) => {
      const sectionIndices = getSectionIndices();
      if (sectionIndex < sectionIndices.length) {
        goToSlide(sectionIndices[sectionIndex]);
      }
    },
    [getSectionIndices, goToSlide],
  );

  const goToNextSection = useCallback(() => {
    if (!currentSong) return;

    const sectionIndices = getSectionIndices();
    if (sectionIndices.length === 0) return;

    const { currentSlideIndex } = presentationState;
    const nextSectionSlideIndex = sectionIndices.find(
      (idx) => idx > currentSlideIndex,
    );

    if (nextSectionSlideIndex !== undefined) {
      goToSlide(nextSectionSlideIndex);
    }
  }, [currentSong, getSectionIndices, presentationState, goToSlide]);

  const goToPreviousSection = useCallback(() => {
    if (!currentSong) return;

    const sectionIndices = getSectionIndices();
    if (sectionIndices.length === 0) return;

    const { currentSlideIndex } = presentationState;

    let currentSectionIdx = -1;
    for (let i = sectionIndices.length - 1; i >= 0; i--) {
      if (currentSlideIndex >= sectionIndices[i]) {
        currentSectionIdx = i;
        break;
      }
    }

    if (
      currentSectionIdx > 0 &&
      currentSlideIndex === sectionIndices[currentSectionIdx]
    ) {
      goToSlide(sectionIndices[currentSectionIdx - 1]);
    } else if (currentSectionIdx >= 0) {
      goToSlide(sectionIndices[currentSectionIdx]);
    }
  }, [currentSong, getSectionIndices, presentationState, goToSlide]);

  const getCurrentSection = useCallback((): {
    name: string;
    index: number;
  } | null => {
    if (!currentSong) return null;

    const sectionIndices = getSectionIndices();
    if (sectionIndices.length === 0) return null;

    const { currentSlideIndex } = presentationState;

    for (let i = sectionIndices.length - 1; i >= 0; i--) {
      if (currentSlideIndex >= sectionIndices[i]) {
        const slide = currentSong.slides[sectionIndices[i]];
        if (slide?.section) {
          return { name: slide.section, index: i };
        }
      }
    }

    return null;
  }, [currentSong, getSectionIndices, presentationState]);

  return (
    <PresentationContext.Provider
      value={{
        presentationState,
        currentSong,
        currentSlide,
        nextSlide,
        prevSlide,
        nextSong,
        prevSong,
        goToSong,
        goToSlide,
        goToPosition,
        goToSection,
        goToNextSection,
        goToPreviousSection,
        getCurrentSection,
        getSectionIndices,
        resetPosition,
      }}
    >
      {children}
    </PresentationContext.Provider>
  );
}
