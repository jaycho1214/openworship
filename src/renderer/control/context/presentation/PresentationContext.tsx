import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Song, Slide, PresentationState } from '../../../shared/types/song';
import { SetlistItem, isSongItem } from '../../../../shared/types/setlistItem';
import { getItemSlides } from '../../../shared/utils/setlistItemUtils';
import { useSetlist } from '../setlist/SetlistContext';

interface PresentationContextType {
  presentationState: PresentationState;
  // Item-based (unified)
  currentItem: SetlistItem | null;
  currentItemSlides: Slide[];
  currentItemIndex: number;
  // Legacy song-based (for backward compatibility)
  currentSong: Song | null;
  currentSlide: Slide | null;
  // Navigation
  nextSlide: () => void;
  prevSlide: () => void;
  nextSong: () => void;
  prevSong: () => void;
  goToSlide: (index: number) => void;
  goToItem: (itemIndex: number, slideIndex?: number) => void;
  goToSection: (sectionIndex: number) => void;
  goToNextSection: () => void;
  goToPreviousSection: () => void;
  getSectionIndices: () => number[];
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
      currentSongIndex: 0, // Now used as currentItemIndex
      currentSlideIndex: 0,
      isBlank: false,
      isVerseHidden: false,
      currentVideoPath: null,
    },
  );

  // Track current item by ID for stability during reordering
  const currentItemIdRef = useRef<string | null>(null);
  const prevItemsRef = useRef<SetlistItem[]>([]);

  // Get current item index (alias for clarity)
  const currentItemIndex = presentationState.currentSongIndex;

  // Get items array
  const items = useMemo(() => currentSetlist?.items ?? [], [currentSetlist]);

  // Get current item from items array
  const currentItem = useMemo(
    () => items[currentItemIndex] ?? null,
    [items, currentItemIndex],
  );

  // Get slides for the current item (works for all item types)
  const currentItemSlides = useMemo(
    () => getItemSlides(currentItem),
    [currentItem],
  );

  // Legacy: Get current song (only if current item is a song)
  const currentSong = useMemo(() => {
    if (currentItem && isSongItem(currentItem)) {
      // eslint-disable-next-line no-underscore-dangle
      return currentItem._song ?? null;
    }
    return null;
  }, [currentItem]);

  // Update item ID ref when current item changes
  useEffect(() => {
    if (currentItem) {
      currentItemIdRef.current = currentItem.id;
    }
  }, [currentItem]);

  // Handle item reordering - maintain focus on the same item
  // Uses Set for O(n) comparison instead of O(n log n) sort + O(n) join
  useEffect(() => {
    if (!currentSetlist) return;

    const prevItems = prevItemsRef.current;
    const currentItems = items;

    // Check if this is a reorder (same items, different order)
    if (
      prevItems.length > 0 &&
      currentItems.length === prevItems.length &&
      currentItemIdRef.current
    ) {
      // Use Set for O(1) lookup instead of sort + join
      const prevIdSet = new Set(prevItems.map((i) => i.id));
      const hasSameIds = currentItems.every((item) => prevIdSet.has(item.id));

      // Same items, possibly reordered
      if (hasSameIds) {
        const newIndex = currentItems.findIndex(
          (i) => i.id === currentItemIdRef.current,
        );
        if (
          newIndex !== -1 &&
          newIndex !== presentationState.currentSongIndex
        ) {
          setPresentationState((prev) => ({
            ...prev,
            currentSongIndex: newIndex,
          }));
        }
      }
    }

    prevItemsRef.current = currentItems;
  }, [currentSetlist, items, presentationState.currentSongIndex]);

  // Get current slide from current item's slides
  const currentSlide = useMemo(
    () => currentItemSlides[presentationState.currentSlideIndex] ?? null,
    [currentItemSlides, presentationState.currentSlideIndex],
  );

  const nextSlide = useCallback(() => {
    if (!currentSetlist || items.length === 0) return;

    setPresentationState((prev) => {
      const currentSlides = getItemSlides(items[prev.currentSongIndex]);

      if (prev.currentSlideIndex < currentSlides.length - 1) {
        return { ...prev, currentSlideIndex: prev.currentSlideIndex + 1 };
      }
      if (prev.currentSongIndex < items.length - 1) {
        return {
          ...prev,
          currentSongIndex: prev.currentSongIndex + 1,
          currentSlideIndex: 0,
        };
      }
      return prev;
    });
  }, [currentSetlist, items]);

  const prevSlide = useCallback(() => {
    if (!currentSetlist || items.length === 0) return;

    setPresentationState((prev) => {
      if (prev.currentSlideIndex > 0) {
        return { ...prev, currentSlideIndex: prev.currentSlideIndex - 1 };
      }
      if (prev.currentSongIndex > 0) {
        const prevItem = items[prev.currentSongIndex - 1];
        const prevSlides = getItemSlides(prevItem);
        return {
          ...prev,
          currentSongIndex: prev.currentSongIndex - 1,
          currentSlideIndex: prevSlides.length - 1,
        };
      }
      return prev;
    });
  }, [currentSetlist, items]);

  const nextSong = useCallback(() => {
    if (!currentSetlist || items.length === 0) return;

    setPresentationState((prev) => {
      if (prev.currentSongIndex < items.length - 1) {
        return {
          ...prev,
          currentSongIndex: prev.currentSongIndex + 1,
          currentSlideIndex: 0,
        };
      }
      return prev;
    });
  }, [currentSetlist, items]);

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

  const goToSlide = useCallback((index: number) => {
    setPresentationState((prev) => ({
      ...prev,
      currentSlideIndex: index,
    }));
  }, []);

  // Go to a specific item by index
  const goToItem = useCallback((itemIndex: number, slideIndex: number = 0) => {
    setPresentationState((prev) => ({
      ...prev,
      currentSongIndex: itemIndex,
      currentSlideIndex: slideIndex,
    }));
  }, []);

  // Always return first 9 slide indices for number key shortcuts
  const getSectionIndices = useCallback((): number[] => {
    if (currentItemSlides.length === 0) return [];
    // Always return first 9 slides for consistent keyboard navigation
    return currentItemSlides.map((_, i) => i).slice(0, 9);
  }, [currentItemSlides]);

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
    if (currentItemSlides.length === 0) return;

    const sectionIndices = getSectionIndices();
    if (sectionIndices.length === 0) return;

    const { currentSlideIndex } = presentationState;
    const nextSectionSlideIndex = sectionIndices.find(
      (idx) => idx > currentSlideIndex,
    );

    if (nextSectionSlideIndex !== undefined) {
      goToSlide(nextSectionSlideIndex);
    }
  }, [currentItemSlides, getSectionIndices, presentationState, goToSlide]);

  const goToPreviousSection = useCallback(() => {
    if (currentItemSlides.length === 0) return;

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
  }, [currentItemSlides, getSectionIndices, presentationState, goToSlide]);

  const contextValue = useMemo(
    () => ({
      presentationState,
      // Item-based
      currentItem,
      currentItemSlides,
      currentItemIndex,
      // Legacy
      currentSong,
      currentSlide,
      // Navigation
      nextSlide,
      prevSlide,
      nextSong,
      prevSong,
      goToSlide,
      goToItem,
      goToSection,
      goToNextSection,
      goToPreviousSection,
      getSectionIndices,
    }),
    [
      presentationState,
      currentItem,
      currentItemSlides,
      currentItemIndex,
      currentSong,
      currentSlide,
      nextSlide,
      prevSlide,
      nextSong,
      prevSong,
      goToSlide,
      goToItem,
      goToSection,
      goToNextSection,
      goToPreviousSection,
      getSectionIndices,
    ],
  );

  return (
    <PresentationContext.Provider value={contextValue}>
      {children}
    </PresentationContext.Provider>
  );
}
