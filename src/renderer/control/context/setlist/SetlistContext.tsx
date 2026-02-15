/* eslint-disable no-underscore-dangle */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Song, Slide, SlideOverrides } from '../../../shared/types/song';
import {
  SetlistItem,
  SetlistItemInput,
  SongSetlistItem,
  BibleSetlistItem,
  AnnouncementSetlistItem,
  isSongItem,
} from '../../../../shared/types/setlistItem';
import {
  parseLyricsToSlides,
  resolveSectionReferences,
  generateId,
} from '../../../shared/utils/lyricsParser';
import { getItemSlides as getItemSlidesFromItem } from '../../../shared/utils/setlistItemUtils';
import { useSession } from '../session/SessionContext';

import { getElectron } from '../../../shared/hooks/useElectron';

interface DbLibrarySong {
  id: string;
  title: string;
  lyrics: string;
  categories: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface DbSessionItem {
  id: string;
  sessionId: string;
  type: 'song' | 'bible' | 'announcement';
  position: number;
  // Song fields
  songId?: string;
  // Bible fields
  translationId?: string;
  translationName?: string;
  bookId?: string;
  bookName?: string;
  chapter?: number;
  startVerse?: number;
  endVerse?: number;
  displayMode?: 'one-per-slide' | 'range-on-slide';
  // Announcement fields
  title?: string;
  content?: string;
  // Song data if joined
  songTitle?: string;
  songLyrics?: string;
  createdAt: string;
  updatedAt: string;
}

// Extended setlist interface that uses unified items
interface UnifiedSetlist {
  id: string;
  name: string;
  items: SetlistItem[];
  // Keep songs array for backward compatibility during transition
  songs: Song[];
  createdAt: Date;
  updatedAt: Date;
}

interface SetlistContextType {
  currentSetlist: UnifiedSetlist | null;
  setCurrentSetlist: (setlist: UnifiedSetlist | null) => void;
  // Unified item methods
  addItem: (input: SetlistItemInput) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<SetlistItem>) => void;
  deleteItem: (itemId: string) => void;
  reorderItems: (fromIndex: number, toIndex: number) => void;
  getItemSlides: (itemId: string) => Slide[];
  // Legacy song methods for backward compatibility
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
    overrides?: SlideOverrides,
    lineRoles?: ('body' | 'reference')[],
  ) => void;
  loadSessionSongs: (dbSongs: DbLibrarySong[]) => Song[];
  refreshSongFromLibrary: (songId: string) => void;
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

// Helper to convert announcement content to slides
function announcementToSlides(title: string, content: string): Slide[] {
  const slides: Slide[] = [];

  // Title slide
  slides.push({
    id: generateId(),
    lines: [title],
    section: 'Title',
  });

  // Content slides (split by blank lines)
  if (content.trim()) {
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
    paragraphs.forEach((paragraph, index) => {
      slides.push({
        id: generateId(),
        lines: paragraph.split('\n').filter((line) => line.trim()),
        section: `Paragraph ${index + 1}`,
      });
    });
  }

  return slides;
}

// Helper to convert DbSessionItem to SetlistItem
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function dbItemToSetlistItem(
  dbItem: DbSessionItem,
  bibleSlides?: Slide[],
): SetlistItem {
  const base = {
    id: dbItem.id,
    position: dbItem.position,
    createdAt: dbItem.createdAt,
  };

  if (dbItem.type === 'song' && dbItem.songId) {
    const slides = dbItem.songLyrics
      ? resolveSectionReferences(parseLyricsToSlides(dbItem.songLyrics))
      : [];
    return {
      ...base,
      type: 'song',
      songId: dbItem.songId,
      _song: dbItem.songTitle
        ? {
            id: dbItem.songId,
            title: dbItem.songTitle,
            rawLyrics: dbItem.songLyrics || '',
            slides,
            createdAt: dbItem.createdAt,
            updatedAt: dbItem.updatedAt,
          }
        : undefined,
    } as SongSetlistItem;
  }

  if (dbItem.type === 'bible') {
    return {
      ...base,
      type: 'bible',
      translationId: dbItem.translationId || '',
      translationName: dbItem.translationName || '',
      bookId: dbItem.bookId || '',
      bookName: dbItem.bookName || '',
      chapter: dbItem.chapter || 1,
      startVerse: dbItem.startVerse || 1,
      endVerse: dbItem.endVerse || 1,
      displayMode: dbItem.displayMode || 'one-per-slide',
      _slides: bibleSlides || [],
    } as BibleSetlistItem;
  }

  if (dbItem.type === 'announcement') {
    const title = dbItem.title || '';
    const content = dbItem.content || '';
    return {
      ...base,
      type: 'announcement',
      title,
      content,
      _slides: announcementToSlides(title, content),
    } as AnnouncementSetlistItem;
  }

  // Fallback - should not happen
  throw new Error(`Unknown item type: ${dbItem.type}`);
}

export function SetlistProvider({ children }: SetlistProviderProps) {
  const { currentSessionId } = useSession();
  const [currentSetlist, setCurrentSetlist] = useState<UnifiedSetlist | null>(
    null,
  );

  const loadSessionSongs = useCallback((dbSongs: DbLibrarySong[]) => {
    const songs: Song[] = dbSongs.map((dbSong) => ({
      id: dbSong.id,
      title: dbSong.title,
      rawLyrics: dbSong.lyrics,
      slides: resolveSectionReferences(parseLyricsToSlides(dbSong.lyrics)),
      createdAt: dbSong.createdAt,
      updatedAt: dbSong.updatedAt,
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

    // Try to load unified items first, fall back to legacy songs
    const loadSession = async () => {
      try {
        // First try to get unified items
        if (electron.sessionItem) {
          const itemsResult =
            await electron.sessionItem.getAll(currentSessionId);
          if (
            itemsResult.success &&
            itemsResult.data &&
            itemsResult.data.length > 0
          ) {
            // The handler already returns fully populated SetlistItem[] with _song and _slides
            const items: SetlistItem[] = itemsResult.data;

            // Build songs array from song items for backward compatibility
            const songs: Song[] = items
              .filter(isSongItem)
              .map((item) => item._song)
              .filter((song): song is Song => song !== undefined);

            // Get session name
            const sessionResult =
              await electron.session.getById(currentSessionId);
            const sessionName =
              sessionResult.success && sessionResult.data
                ? sessionResult.data.name
                : '';

            setCurrentSetlist({
              id: currentSessionId,
              name: sessionName,
              items,
              songs,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            return;
          }
        }

        // Fall back to legacy song loading
        const result = await electron.session.getById(currentSessionId);
        if (result.success && result.data) {
          const songs = result.data.songs
            ? loadSessionSongs(result.data.songs)
            : [];

          // Convert legacy songs to unified items
          const items: SetlistItem[] = songs.map((song, index) => ({
            id: generateId(),
            type: 'song' as const,
            songId: song.id,
            position: index,
            _song: song,
            createdAt: song.createdAt,
            updatedAt: song.updatedAt,
          }));

          setCurrentSetlist({
            id: currentSessionId,
            name: result.data.name,
            items,
            songs,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          // Session not found - initialize empty setlist
          setCurrentSetlist({
            id: currentSessionId,
            name: '',
            items: [],
            songs: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        // Initialize empty setlist on error
        setCurrentSetlist({
          id: currentSessionId,
          name: '',
          items: [],
          songs: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    };

    loadSession();
  }, [currentSessionId, loadSessionSongs]);

  // Add unified item - optimized with parallel fetching
  const addItem = useCallback(
    async (input: SetlistItemInput): Promise<void> => {
      const electron = getElectron();
      if (!electron || !currentSessionId) return;

      try {
        // Add to database
        if (electron.sessionItem) {
          // Start fetching additional data in PARALLEL with database add for better performance
          let songPromise: Promise<{
            success: boolean;
            data?: DbLibrarySong;
            error?: string;
          }> | null = null;
          let bibleSlidesPromise: Promise<{
            success: boolean;
            data?: Slide[];
            error?: string;
          }> | null = null;

          if (input.type === 'song') {
            songPromise = electron.library.getById(input.songId);
          } else if (input.type === 'bible' && electron.bible) {
            bibleSlidesPromise = electron.bible.versesToSlides(
              input.bookId,
              input.bookName,
              input.chapter,
              input.startVerse,
              input.endVerse,
              input.displayMode,
            );
          }

          // Wait for database add (always required)
          const result = await electron.sessionItem.add(
            currentSessionId,
            input,
          );
          if (!result.success || !result.data) {
            console.error('Failed to add item to session:', result.error);
            return;
          }

          const dbItem = result.data;

          // Build the SetlistItem
          let item: SetlistItem;

          if (input.type === 'song') {
            // Await the song data (already started in parallel)
            const songResult = await songPromise;
            if (songResult?.success && songResult.data) {
              const song: Song = {
                id: songResult.data.id,
                title: songResult.data.title,
                rawLyrics: songResult.data.lyrics,
                slides: resolveSectionReferences(
                  parseLyricsToSlides(songResult.data.lyrics),
                ),
                createdAt: songResult.data.createdAt,
                updatedAt: songResult.data.updatedAt,
              };

              item = {
                id: dbItem.id,
                type: 'song',
                songId: input.songId,
                position: dbItem.position,
                _song: song,
                createdAt: dbItem.createdAt,
                updatedAt: dbItem.updatedAt,
              };
            } else {
              return; // Song not found
            }
          } else if (input.type === 'bible') {
            // Await Bible slides (already started in parallel)
            let slides: Slide[] = [];
            if (bibleSlidesPromise) {
              const slidesResult = await bibleSlidesPromise;
              if (slidesResult?.success && slidesResult.data) {
                slides = slidesResult.data;
              }
            }

            item = {
              id: dbItem.id,
              type: 'bible',
              translationId: input.translationId,
              translationName: input.translationName,
              bookId: input.bookId,
              bookName: input.bookName,
              chapter: input.chapter,
              startVerse: input.startVerse,
              endVerse: input.endVerse,
              displayMode: input.displayMode,
              position: dbItem.position,
              _slides: slides,
              createdAt: dbItem.createdAt,
              updatedAt: dbItem.updatedAt,
            };
          } else if (input.type === 'announcement') {
            item = {
              id: dbItem.id,
              type: 'announcement',
              title: input.title,
              content: input.content || '',
              position: dbItem.position,
              _slides: announcementToSlides(input.title, input.content || ''),
              createdAt: dbItem.createdAt,
              updatedAt: dbItem.updatedAt,
            };
          } else {
            return; // Unknown type
          }

          // Update local state
          setCurrentSetlist((prev) => {
            if (!prev) return prev;

            const newItems = [...prev.items, item];
            const newSongs =
              item.type === 'song' && item._song
                ? [...prev.songs, item._song]
                : prev.songs;

            return {
              ...prev,
              items: newItems,
              songs: newSongs,
              updatedAt: new Date(),
            };
          });
        }
      } catch (error) {
        console.error('Failed to add item:', error);
      }
    },
    [currentSessionId],
  );

  // Update item
  const updateItem = useCallback(
    (itemId: string, updates: Partial<SetlistItem>) => {
      setCurrentSetlist((prev) => {
        if (!prev) return prev;

        const newItems = prev.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              ...updates,
              updatedAt: new Date().toISOString(),
            } as SetlistItem;
          }
          return item;
        });

        // Update songs array if a song item was updated
        const updatedItem = newItems.find((i) => i.id === itemId);
        let newSongs = prev.songs;
        if (updatedItem && isSongItem(updatedItem) && updatedItem._song) {
          newSongs = prev.songs.map((song) =>
            song.id === updatedItem.songId ? updatedItem._song! : song,
          );
        }

        return {
          ...prev,
          items: newItems,
          songs: newSongs,
          updatedAt: new Date(),
        };
      });
    },
    [],
  );

  // Delete item
  const deleteItem = useCallback(
    (itemId: string) => {
      const electron = getElectron();

      setCurrentSetlist((prev) => {
        if (!prev) return prev;

        const itemToDelete = prev.items.find((i) => i.id === itemId);
        const newItems = prev.items.filter((i) => i.id !== itemId);

        // Remove from songs array if it was a song
        let newSongs = prev.songs;
        if (itemToDelete && isSongItem(itemToDelete)) {
          newSongs = prev.songs.filter((s) => s.id !== itemToDelete.songId);
        }

        return {
          ...prev,
          items: newItems,
          songs: newSongs,
          updatedAt: new Date(),
        };
      });

      // Delete from database
      if (electron?.sessionItem) {
        electron.sessionItem
          .delete(itemId)
          .catch((err: unknown) =>
            console.error('Failed to delete item:', err),
          );
      }
    },
    [currentSessionId],
  );

  // Reorder items
  const reorderItems = useCallback(
    (fromIndex: number, toIndex: number) => {
      const electron = getElectron();

      setCurrentSetlist((prev) => {
        if (!prev) return prev;

        const newItems = arrayMove(prev.items, fromIndex, toIndex).map(
          (item, index) => ({
            ...item,
            position: index,
          }),
        );

        // Update songs array order based on song items
        const newSongs = newItems
          .filter(isSongItem)
          .map((item) => item._song)
          .filter((song): song is Song => song !== undefined);

        // Persist to database
        if (electron?.sessionItem && currentSessionId) {
          const itemIds = newItems.map((i) => i.id);
          electron.sessionItem
            .reorder(currentSessionId, itemIds)
            .catch((err: unknown) =>
              console.error('Failed to reorder items:', err),
            );
        }

        return {
          ...prev,
          items: newItems,
          songs: newSongs,
          updatedAt: new Date(),
        };
      });
    },
    [currentSessionId],
  );

  // Get slides for an item by ID
  const getItemSlides = useCallback(
    (itemId: string): Slide[] => {
      if (!currentSetlist) return [];
      const item = currentSetlist.items.find((i) => i.id === itemId);
      return getItemSlidesFromItem(item ?? null);
    },
    [currentSetlist],
  );

  // Legacy methods for backward compatibility
  const addSong = useCallback(
    (title: string, rawLyrics: string) => {
      const electron = getElectron();
      if (!electron) return;

      electron.library
        .findByTitle(title)
        .then(
          async (findResult: {
            success: boolean;
            data?: { id: string } | null;
          }) => {
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

            // Use unified addItem
            await addItem({ type: 'song', songId });
          },
        )
        .catch((err: unknown) =>
          console.error('Failed to check/add song:', err),
        );
    },
    [addItem],
  );

  const updateSong = useCallback(
    (songId: string, title: string, rawLyrics: string) => {
      const electron = getElectron();
      const slides = resolveSectionReferences(parseLyricsToSlides(rawLyrics));

      // Update local state
      setCurrentSetlist((prev) => {
        if (!prev) return prev;

        // Update in items array
        const newItems = prev.items.map((item) => {
          if (isSongItem(item) && item.songId === songId && item._song) {
            return {
              ...item,
              _song: {
                ...item._song,
                title,
                rawLyrics,
                slides,
                updatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });

        // Update in songs array
        const newSongs = prev.songs.map((song) =>
          song.id === songId
            ? {
                ...song,
                title,
                rawLyrics,
                slides,
                updatedAt: new Date().toISOString(),
              }
            : song,
        );

        return {
          ...prev,
          items: newItems,
          songs: newSongs,
          updatedAt: new Date(),
        };
      });

      // Also update the library so changes persist
      if (electron) {
        electron.library
          .update(songId, { title, lyrics: rawLyrics })
          .catch((err: unknown) =>
            console.error('Failed to update song in library:', err),
          );
      }
    },
    [],
  );

  const deleteSong = useCallback(
    (songId: string) => {
      // Find the item with this songId and delete it
      setCurrentSetlist((prev) => {
        if (!prev) return prev;

        const itemToDelete = prev.items.find(
          (i) => isSongItem(i) && i.songId === songId,
        );

        if (itemToDelete) {
          deleteItem(itemToDelete.id);
        }

        return prev;
      });
    },
    [deleteItem],
  );

  const reorderSongs = useCallback(
    (fromIndex: number, toIndex: number) => {
      // For backward compatibility, map song indices to item indices
      setCurrentSetlist((prev) => {
        if (!prev) return prev;

        // Find the actual item indices for the song indices
        const songItems = prev.items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => isSongItem(item));

        if (fromIndex >= songItems.length || toIndex >= songItems.length) {
          return prev;
        }

        const fromItemIndex = songItems[fromIndex].index;
        const toItemIndex = songItems[toIndex].index;

        reorderItems(fromItemIndex, toItemIndex);

        return prev;
      });
    },
    [reorderItems],
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

        // Update songs array
        const newSongs = [...prev.songs];
        newSongs[songIndex] = {
          ...song,
          slides: newSlides,
          updatedAt: new Date().toISOString(),
        };

        // Update items array
        const newItems = prev.items.map((item) => {
          if (isSongItem(item) && item.songId === song.id && item._song) {
            return {
              ...item,
              _song: {
                ...item._song,
                slides: newSlides,
                updatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });

        return {
          ...prev,
          items: newItems,
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

        // Update songs array
        const newSongs = [...prev.songs];
        newSongs[songIndex] = {
          ...song,
          slides: newSlides,
          updatedAt: new Date().toISOString(),
        };

        // Update items array
        const newItems = prev.items.map((item) => {
          if (isSongItem(item) && item.songId === song.id && item._song) {
            return {
              ...item,
              _song: {
                ...item._song,
                slides: newSlides,
                updatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });

        return {
          ...prev,
          items: newItems,
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

      // Update songs array
      const newSongs = [...prev.songs];
      newSongs[songIndex] = {
        ...song,
        slides: newSlides,
        updatedAt: new Date().toISOString(),
      };

      // Update items array
      const newItems = prev.items.map((item) => {
        if (isSongItem(item) && item.songId === song.id && item._song) {
          return {
            ...item,
            _song: {
              ...item._song,
              slides: newSlides,
              updatedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });

      return {
        ...prev,
        items: newItems,
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
      overrides?: SlideOverrides,
      lineRoles?: ('body' | 'reference')[],
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
          // Keep fontSize from overrides for backwards compatibility
          fontSize: overrides?.fontSize,
          overrides,
          ...(lineRoles ? { lineRoles } : {}),
        };

        // Update songs array
        const newSongs = [...prev.songs];
        newSongs[songIndex] = {
          ...song,
          slides: newSlides,
          updatedAt: new Date().toISOString(),
        };

        // Update items array
        const newItems = prev.items.map((item) => {
          if (isSongItem(item) && item.songId === song.id && item._song) {
            return {
              ...item,
              _song: {
                ...item._song,
                slides: newSlides,
                updatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });

        return {
          ...prev,
          items: newItems,
          songs: newSongs,
          updatedAt: new Date(),
        };
      });
    },
    [],
  );

  // Refresh a song from library when it's been edited externally
  const refreshSongFromLibrary = useCallback(async (songId: string) => {
    const electron = getElectron();
    if (!electron) return;

    try {
      const result = await electron.library.getById(songId);
      if (result.success && result.data) {
        const dbSong = result.data;
        const slides = resolveSectionReferences(
          parseLyricsToSlides(dbSong.lyrics),
        );

        setCurrentSetlist((prev) => {
          if (!prev) return prev;

          // Update songs array
          const songIndex = prev.songs.findIndex((s) => s.id === songId);
          if (songIndex === -1) return prev;

          const newSongs = [...prev.songs];
          newSongs[songIndex] = {
            ...newSongs[songIndex],
            title: dbSong.title,
            rawLyrics: dbSong.lyrics,
            slides,
            updatedAt: dbSong.updatedAt,
          };

          // Update items array
          const newItems = prev.items.map((item) => {
            if (isSongItem(item) && item.songId === songId && item._song) {
              return {
                ...item,
                _song: {
                  ...item._song,
                  title: dbSong.title,
                  rawLyrics: dbSong.lyrics,
                  slides,
                  updatedAt: dbSong.updatedAt,
                },
                updatedAt: new Date().toISOString(),
              };
            }
            return item;
          });

          return {
            ...prev,
            items: newItems,
            songs: newSongs,
            updatedAt: new Date(),
          };
        });
      }
    } catch (error) {
      console.error('Failed to refresh song from library:', error);
    }
  }, []);

  const value = useMemo<SetlistContextType>(
    () => ({
      currentSetlist,
      setCurrentSetlist,
      // Unified item methods
      addItem,
      updateItem,
      deleteItem,
      reorderItems,
      getItemSlides,
      // Legacy methods
      addSong,
      updateSong,
      deleteSong,
      reorderSongs,
      reorderSlides,
      duplicateSlide,
      deleteSlide,
      updateSlide,
      loadSessionSongs,
      refreshSongFromLibrary,
    }),
    [
      currentSetlist,
      setCurrentSetlist,
      addItem,
      updateItem,
      deleteItem,
      reorderItems,
      getItemSlides,
      addSong,
      updateSong,
      deleteSong,
      reorderSongs,
      reorderSlides,
      duplicateSlide,
      deleteSlide,
      updateSlide,
      loadSessionSongs,
      refreshSongFromLibrary,
    ],
  );

  return (
    <SetlistContext.Provider value={value}>{children}</SetlistContext.Provider>
  );
}
