import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Song, Slide, Setlist } from '../../../shared/types/song';
import {
  parseLyricsToSlides,
  resolveSectionReferences,
  generateId,
} from '../../../shared/utils/lyricsParser';
import { useSession } from '../session/SessionContext';

// Helper to safely access electron API
const getElectron = () => (window as any).electron;

interface DbLibrarySong {
  id: string;
  title: string;
  lyrics: string;
  categories: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface SetlistContextType {
  currentSetlist: Setlist | null;
  setCurrentSetlist: (setlist: Setlist | null) => void;
  addSong: (title: string, rawLyrics: string) => void;
  updateSong: (songId: string, title: string, rawLyrics: string) => void;
  deleteSong: (songId: string) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;
  reorderSlides: (
    songIndex: number,
    fromIndex: number,
    toIndex: number,
  ) => void;
  duplicateSlide: (songIndex: number, slideIndex: number) => void;
  deleteSlide: (songIndex: number, slideIndex: number) => void;
  updateSlide: (
    songIndex: number,
    slideIndex: number,
    lines: string[],
    section?: string,
  ) => void;
  loadSessionSongs: (dbSongs: DbLibrarySong[]) => void;
}

const SetlistContext = createContext<SetlistContextType | null>(null);

export function useSetlist() {
  const context = useContext(SetlistContext);
  if (!context) {
    throw new Error('useSetlist must be used within a SetlistProvider');
  }
  return context;
}

interface SetlistProviderProps {
  children: ReactNode;
}

export function SetlistProvider({ children }: SetlistProviderProps) {
  const { currentSessionId } = useSession();
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);

  const loadSessionSongs = useCallback((dbSongs: DbLibrarySong[]) => {
    const songs: Song[] = dbSongs.map((dbSong) => ({
      id: dbSong.id,
      title: dbSong.title,
      rawLyrics: dbSong.lyrics,
      slides: resolveSectionReferences(parseLyricsToSlides(dbSong.lyrics)),
      createdAt: new Date(dbSong.createdAt),
      updatedAt: new Date(dbSong.updatedAt),
    }));
    return songs;
  }, []);

  // Load setlist when session changes
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    if (!currentSessionId) {
      setCurrentSetlist(null);
      return;
    }

    // Fetch session with songs and initialize setlist
    electron.session
      .getById(currentSessionId)
      .then(
        (result: {
          success: boolean;
          data?: { name: string; songs?: DbLibrarySong[] };
        }) => {
          if (result.success && result.data) {
            const songs = result.data.songs
              ? loadSessionSongs(result.data.songs)
              : [];
            setCurrentSetlist({
              id: currentSessionId,
              name: result.data.name,
              songs,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            // Session not found - initialize empty setlist
            setCurrentSetlist({
              id: currentSessionId,
              name: '',
              songs: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        },
      )
      .catch((err: Error) => {
        console.error('Failed to load session:', err);
        // Initialize empty setlist on error
        setCurrentSetlist({
          id: currentSessionId,
          name: '',
          songs: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
  }, [currentSessionId, loadSessionSongs]);

  const addSong = useCallback(
    (title: string, rawLyrics: string) => {
      const electron = getElectron();
      if (!electron) return;

      electron.library
        .findByTitle(title)
        .then(async (findResult: any) => {
          let songId: string;

          if (findResult.success && findResult.data) {
            songId = findResult.data.id;
          } else {
            const addResult = await electron.library.add({
              title,
              lyrics: rawLyrics,
              categories: [],
              tags: [],
            });
            if (!addResult.success || !addResult.data) {
              console.error('Failed to add song to library');
              return;
            }
            songId = addResult.data.id;
          }

          // Check if song is already in setlist (prevent duplicates)
          setCurrentSetlist((prev) => {
            if (!prev) return prev;
            if (prev.songs.some((s) => s.id === songId)) {
              // Song already in setlist, don't add again
              return prev;
            }

            const slides = resolveSectionReferences(
              parseLyricsToSlides(rawLyrics),
            );
            const newSong: Song = {
              id: songId,
              title,
              rawLyrics,
              slides,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Add to database session
            if (currentSessionId) {
              electron.session
                .addSong(currentSessionId, songId)
                .catch((err: any) =>
                  console.error('Failed to add song to session:', err),
                );
            }

            return {
              ...prev,
              songs: [...prev.songs, newSong],
              updatedAt: new Date(),
            };
          });
        })
        .catch((err: any) => console.error('Failed to check/add song:', err));
    },
    [currentSessionId],
  );

  const updateSong = useCallback(
    (songId: string, title: string, rawLyrics: string) => {
      const slides = resolveSectionReferences(parseLyricsToSlides(rawLyrics));

      setCurrentSetlist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          songs: prev.songs.map((song) =>
            song.id === songId
              ? { ...song, title, rawLyrics, slides, updatedAt: new Date() }
              : song,
          ),
          updatedAt: new Date(),
        };
      });
    },
    [],
  );

  const deleteSong = useCallback(
    (songId: string) => {
      setCurrentSetlist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          songs: prev.songs.filter((song) => song.id !== songId),
          updatedAt: new Date(),
        };
      });

      if (currentSessionId) {
        const electron = getElectron();
        if (electron) {
          electron.session
            .removeSong(currentSessionId, songId)
            .catch((err: any) =>
              console.error('Failed to remove song from session:', err),
            );
        }
      }
    },
    [currentSessionId],
  );

  const reorderSongs = useCallback(
    (fromIndex: number, toIndex: number) => {
      setCurrentSetlist((prev) => {
        if (!prev) return prev;
        const newSongs = [...prev.songs];
        const [removed] = newSongs.splice(fromIndex, 1);
        newSongs.splice(toIndex, 0, removed);

        if (currentSessionId) {
          const electron = getElectron();
          if (electron) {
            const songIds = newSongs.map((s) => s.id);
            electron.session
              .reorderSongs(currentSessionId, songIds)
              .catch((err: any) =>
                console.error('Failed to reorder songs in session:', err),
              );
          }
        }

        return {
          ...prev,
          songs: newSongs,
          updatedAt: new Date(),
        };
      });
    },
    [currentSessionId],
  );

  const reorderSlides = useCallback(
    (songIndex: number, fromIndex: number, toIndex: number) => {
      setCurrentSetlist((prev) => {
        if (!prev) return prev;
        const song = prev.songs[songIndex];
        if (!song) return prev;

        const newSlides = [...song.slides];
        const [removed] = newSlides.splice(fromIndex, 1);
        newSlides.splice(toIndex, 0, removed);

        const newSongs = [...prev.songs];
        newSongs[songIndex] = {
          ...song,
          slides: newSlides,
          updatedAt: new Date(),
        };

        return {
          ...prev,
          songs: newSongs,
          updatedAt: new Date(),
        };
      });
    },
    [],
  );

  const duplicateSlide = useCallback(
    (songIndex: number, slideIndex: number) => {
      setCurrentSetlist((prev) => {
        if (!prev) return prev;
        const song = prev.songs[songIndex];
        if (!song || !song.slides[slideIndex]) return prev;

        const slideToDuplicate = song.slides[slideIndex];
        const newSlide: Slide = {
          id: generateId(),
          lines: [...slideToDuplicate.lines],
        };

        const newSlides = [...song.slides];
        newSlides.splice(slideIndex + 1, 0, newSlide);

        const newSongs = [...prev.songs];
        newSongs[songIndex] = {
          ...song,
          slides: newSlides,
          updatedAt: new Date(),
        };

        return {
          ...prev,
          songs: newSongs,
          updatedAt: new Date(),
        };
      });
    },
    [],
  );

  const deleteSlide = useCallback((songIndex: number, slideIndex: number) => {
    setCurrentSetlist((prev) => {
      if (!prev) return prev;
      const song = prev.songs[songIndex];
      if (!song || song.slides.length <= 1) return prev;

      const newSlides = song.slides.filter((_, i) => i !== slideIndex);

      const newSongs = [...prev.songs];
      newSongs[songIndex] = {
        ...song,
        slides: newSlides,
        updatedAt: new Date(),
      };

      return {
        ...prev,
        songs: newSongs,
        updatedAt: new Date(),
      };
    });
  }, []);

  const updateSlide = useCallback(
    (
      songIndex: number,
      slideIndex: number,
      lines: string[],
      section?: string,
    ) => {
      setCurrentSetlist((prev) => {
        if (!prev) return prev;
        const song = prev.songs[songIndex];
        if (!song || !song.slides[slideIndex]) return prev;

        const newSlides = [...song.slides];
        newSlides[slideIndex] = {
          ...newSlides[slideIndex],
          lines,
          section,
        };

        const newSongs = [...prev.songs];
        newSongs[songIndex] = {
          ...song,
          slides: newSlides,
          updatedAt: new Date(),
        };

        return {
          ...prev,
          songs: newSongs,
          updatedAt: new Date(),
        };
      });
    },
    [],
  );

  return (
    <SetlistContext.Provider
      value={{
        currentSetlist,
        setCurrentSetlist,
        addSong,
        updateSong,
        deleteSong,
        reorderSongs,
        reorderSlides,
        duplicateSlide,
        deleteSlide,
        updateSlide,
        loadSessionSongs,
      }}
    >
      {children}
    </SetlistContext.Provider>
  );
}
