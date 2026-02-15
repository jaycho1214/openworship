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
import {
  getItemSlides,
  getItemTitle,
} from '../../../shared/utils/setlistItemUtils';
import { useSetlist } from '../setlist/SetlistContext';

// Type for next slide preview (On Deck)
interface NextSlidePreview {
  slide: Slide;
  isNextItem: boolean; // True if from next item, false if same item
  nextItemTitle?: string; // Title of next item if crossing item boundary
  nextItemType?: SetlistItem['type']; // Type of next item
}

interface PresentationContextType {
  presentationState: PresentationState;
  // Item-based (unified)
  currentItem: SetlistItem | null;
  currentItemSlides: Slide[];
  currentItemIndex: number;
  // Legacy song-based (for backward compatibility)
  currentSong: Song | null;
  currentSlide: Slide | null;
  // Next slide preview (On Deck)
  nextSlidePreview: NextSlidePreview | null;
  // Navigation
  nextSlide: () => void;
  prevSlide: () => void;
  nextSong: () => void;
  prevSong: () => void;
  goToSong: (index: number) => void;
  goToSlide: (index: number) => void;
  goToPosition: (songIndex: number, slideIndex: number) => void;
  goToItem: (itemIndex: number, slideIndex?: number) => void;
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

  // Compute next slide preview (On Deck)
  const nextSlidePreview = useMemo((): NextSlidePreview | null => {
    const { currentSlideIndex, currentSongIndex: currentIdx } =
      presentationState;

    // Check if there's a next slide in the current item
    if (currentSlideIndex < currentItemSlides.length - 1) {
      return {
        slide: currentItemSlides[currentSlideIndex + 1],
        isNextItem: false,
      };
    }

    // Check if there's a next item
    if (currentIdx < items.length - 1) {
      const nextItem = items[currentIdx + 1];
      const nextItemSlides = getItemSlides(nextItem);
      if (nextItemSlides.length > 0) {
        return {
          slide: nextItemSlides[0],
          isNextItem: true,
          nextItemTitle: getItemTitle(nextItem),
          nextItemType: nextItem.type,
        };
      }
    }

    return null;
  }, [presentationState, currentItemSlides, items]);

  const resetPosition = useCallback(() => {
    setPresentationState((prev) => ({
      ...prev,
      currentSongIndex: 0,
      currentSlideIndex: 0,
    }));
  }, []);

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

  // New: Go to a specific item by index
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

  const getCurrentSection = useCallback((): {
    name: string;
    index: number;
  } | null => {
    if (currentItemSlides.length === 0) return null;

    const sectionIndices = getSectionIndices();
    if (sectionIndices.length === 0) return null;

    const { currentSlideIndex } = presentationState;

    for (let i = sectionIndices.length - 1; i >= 0; i--) {
      if (currentSlideIndex >= sectionIndices[i]) {
        const slide = currentItemSlides[sectionIndices[i]];
        if (slide?.section) {
          return { name: slide.section, index: i };
        }
      }
    }

    return null;
  }, [currentItemSlides, getSectionIndices, presentationState]);

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
      // Next slide preview (On Deck)
      nextSlidePreview,
      // Navigation
      nextSlide,
      prevSlide,
      nextSong,
      prevSong,
      goToSong,
      goToSlide,
      goToPosition,
      goToItem,
      goToSection,
      goToNextSection,
      goToPreviousSection,
      getCurrentSection,
      getSectionIndices,
      resetPosition,
    }),
    [
      presentationState,
      currentItem,
      currentItemSlides,
      currentItemIndex,
      currentSong,
      currentSlide,
      nextSlidePreview,
      nextSlide,
      prevSlide,
      nextSong,
      prevSong,
      goToSong,
      goToSlide,
      goToPosition,
      goToItem,
      goToSection,
      goToNextSection,
      goToPreviousSection,
      getCurrentSection,
      getSectionIndices,
      resetPosition,
    ],
  );

  return (
    <PresentationContext.Provider value={contextValue}>
      {children}
    </PresentationContext.Provider>
  );
}
