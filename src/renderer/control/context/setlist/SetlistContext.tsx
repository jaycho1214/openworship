/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
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
import { toast } from 'sonner';
import { Song, Slide, SlideOverrides } from '../../../shared/types/song';
import {
  SetlistItem,
  SetlistItemInput,
  isSongItem,
} from '../../../../shared/types/setlistItem';
import {
  parseLyricsToSlides,
  resolveSectionReferences,
  generateId,
} from '../../../shared/utils/lyricsParser';
import { getItemSlides as getItemSlidesFromItem } from '../../../shared/utils/setlistItemUtils';
import { useSession } from '../session/SessionContext';
import { useUndo } from '../undo/UndoContext';

import { getElectron } from '../../../shared/hooks/useElectron';

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
  // Unified item methods
  addItem: (input: SetlistItemInput) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<SetlistItem>) => void;
  deleteItem: (itemId: string) => void;
  reorderItems: (fromIndex: number, toIndex: number) => void;
  getItemSlides: (itemId: string) => Slide[];
  // Song convenience methods
  addSong: (title: string, rawLyrics: string) => void;
  updateSong: (songId: string, title: string, rawLyrics: string) => void;
  deleteSong: (songId: string) => void;
  reorderSlides: (
    itemIndex: number,
    fromIndex: number,
    toIndex: number,
  ) => void;
  duplicateSlide: (itemIndex: number, slideIndex: number) => void;
  deleteSlide: (itemIndex: number, slideIndex: number) => void;
  updateSlide: (
    itemIndex: number,
    slideIndex: number,
    lines: string[],
    section?: string,
    overrides?: SlideOverrides,
    lineRoles?: ('body' | 'reference')[],
  ) => void;
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

/**
 * Helper to modify slides for a song item identified by its position in the items array.
 * Returns null if the item is not a song or the transform declines (returns null).
 */
function withSongSlides(
  prev: UnifiedSetlist | null,
  itemIndex: number,
  transform: (song: Song, slides: Slide[]) => Slide[] | null,
): UnifiedSetlist | null {
  if (!prev) return prev;
  const item = prev.items[itemIndex];
  if (!item || !isSongItem(item) || !item._song) return prev;
  const song = prev.songs.find((s) => s.id === item.songId);
  if (!song) return prev;

  const newSlides = transform(song, song.slides);
  if (!newSlides) return prev;

  const ts = new Date().toISOString();
  const newSongs = prev.songs.map((s) =>
    s.id === song.id ? { ...s, slides: newSlides, updatedAt: ts } : s,
  );
  const newItems = prev.items.map((itm) => {
    if (isSongItem(itm) && itm.songId === song.id && itm._song) {
      return {
        ...itm,
        _song: { ...itm._song, slides: newSlides, updatedAt: ts },
        updatedAt: ts,
      };
    }
    return itm;
  });
  return { ...prev, items: newItems, songs: newSongs, updatedAt: new Date() };
}

export function SetlistProvider({ children }: SetlistProviderProps) {
  const { currentSessionId } = useSession();
  const { pushAction } = useUndo();
  const [currentSetlist, setCurrentSetlist] = useState<UnifiedSetlist | null>(
    null,
  );

  // Load setlist when session changes
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    if (!currentSessionId) {
      setCurrentSetlist(null);
      return;
    }

    const loadSession = async () => {
      try {
        // Get session metadata (name)
        const sessionResult = await electron.session.getById(currentSessionId);
        const sessionName =
          sessionResult.success && sessionResult.data
            ? sessionResult.data.name
            : '';

        // Load unified session_items
        if (electron.sessionItem) {
          const itemsResult =
            await electron.sessionItem.getAll(currentSessionId);
          if (itemsResult.success && itemsResult.data) {
            // Re-parse song slides with renderer's parser for consistency
            const items: SetlistItem[] = itemsResult.data.map((item) => {
              if (isSongItem(item) && item._song) {
                return {
                  ...item,
                  _song: {
                    ...item._song,
                    slides: resolveSectionReferences(
                      parseLyricsToSlides(item._song.rawLyrics),
                    ),
                  },
                };
              }
              return item;
            });

            // Build songs array from song items
            const songs: Song[] = items
              .filter(isSongItem)
              .map((item) => item._song)
              .filter((song): song is Song => song !== undefined);

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

        // Initialize empty setlist if loading failed
        setCurrentSetlist({
          id: currentSessionId,
          name: sessionName,
          items: [],
          songs: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (err) {
        console.error('Failed to load session:', err);
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
  }, [currentSessionId]);

  // Add unified item - uses backend's fully populated response
  const addItem = useCallback(
    async (input: SetlistItemInput): Promise<void> => {
      const electron = getElectron();
      if (!electron || !currentSessionId) return;

      try {
        if (!electron.sessionItem) return;

        // The backend handler adds to DB, populates _song/_slides, and returns
        // a fully populated SetlistItem — no redundant re-fetching needed.
        const result = await electron.sessionItem.add(currentSessionId, input);
        if (!result.success || !result.data) {
          console.error('Failed to add item to session:', result.error);
          return;
        }

        // Use the fully populated item from the backend directly
        let item: SetlistItem = result.data;

        // For songs, re-parse slides with the renderer's parser for consistency
        if (isSongItem(item) && item._song) {
          item = {
            ...item,
            _song: {
              ...item._song,
              slides: resolveSectionReferences(
                parseLyricsToSlides(item._song.rawLyrics),
              ),
            },
          };
        }

        // Update local state
        setCurrentSetlist((prev) => {
          if (!prev) return prev;

          const newItems = [...prev.items, item];
          const newSongs =
            isSongItem(item) && item._song
              ? [...prev.songs, item._song]
              : prev.songs;

          return {
            ...prev,
            items: newItems,
            songs: newSongs,
            updatedAt: new Date(),
          };
        });

        // Track for undo: removing the just-added item
        const addedItemId = item.id;
        const addedInput = input;
        const sessionId = currentSessionId;
        pushAction({
          description: `Add ${item.type}`,
          undo: async () => {
            const el = getElectron();
            if (!el?.sessionItem) return;
            // Remove from DB
            await el.sessionItem.delete(addedItemId);
            // Remove from local state
            setCurrentSetlist((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                items: prev.items.filter((i) => i.id !== addedItemId),
                songs: isSongItem(item)
                  ? prev.songs.filter((s) => s.id !== item.songId)
                  : prev.songs,
                updatedAt: new Date(),
              };
            });
          },
          redo: async () => {
            const el = getElectron();
            if (!el?.sessionItem || !sessionId) return;
            const res = await el.sessionItem.add(sessionId, addedInput);
            if (res.success && res.data) {
              let reItem = res.data;
              if (isSongItem(reItem) && reItem._song) {
                reItem = {
                  ...reItem,
                  _song: {
                    ...reItem._song,
                    slides: resolveSectionReferences(
                      parseLyricsToSlides(reItem._song.rawLyrics),
                    ),
                  },
                };
              }
              setCurrentSetlist((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  items: [...prev.items, reItem],
                  songs:
                    isSongItem(reItem) && reItem._song
                      ? [...prev.songs, reItem._song]
                      : prev.songs,
                  updatedAt: new Date(),
                };
              });
            }
          },
        });
      } catch (error) {
        console.error('Failed to add item:', error);
        toast.error('Failed to add item');
      }
    },
    [currentSessionId, pushAction],
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

  // Delete item (with undo support)
  const deleteItem = useCallback(
    (itemId: string) => {
      const electron = getElectron();

      // Capture item data before deletion for undo
      let deletedItem: SetlistItem | undefined;
      let deletedPosition = -1;
      const sessionId = currentSessionId;

      setCurrentSetlist((prev) => {
        if (!prev) return prev;

        deletedItem = prev.items.find((i) => i.id === itemId);
        deletedPosition = prev.items.findIndex((i) => i.id === itemId);
        const newItems = prev.items.filter((i) => i.id !== itemId);

        let newSongs = prev.songs;
        if (deletedItem && isSongItem(deletedItem)) {
          const delSongId = deletedItem.songId;
          newSongs = prev.songs.filter((s) => s.id !== delSongId);
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
        electron.sessionItem.delete(itemId).catch((err: unknown) => {
          console.error('Failed to delete item:', err);
          toast.error('Failed to delete item');
        });
      }

      // Track for undo: re-add the deleted item
      if (deletedItem) {
        const captured = deletedItem;
        pushAction({
          description: `Delete ${captured.type}`,
          undo: async () => {
            // Re-add to database
            const el = getElectron();
            if (!el?.sessionItem || !sessionId) return;
            // Reconstruct the input from captured item data
            let input: SetlistItemInput;
            if (isSongItem(captured)) {
              input = { type: 'song', songId: captured.songId };
            } else if (captured.type === 'announcement') {
              const ann = captured as any;
              input = {
                type: 'announcement',
                title: ann.title || '',
                content: ann.noteText || ann.content || '',
                displayMode: ann.noteDisplayMode || ann.displayMode,
              };
            } else {
              // Bible or other — skip undo for unsupported types
              return;
            }
            const res = await el.sessionItem.add(sessionId, input);
            if (res.success && res.data) {
              let reItem = res.data;
              if (isSongItem(reItem) && reItem._song) {
                reItem = {
                  ...reItem,
                  _song: {
                    ...reItem._song,
                    slides: resolveSectionReferences(
                      parseLyricsToSlides(reItem._song.rawLyrics),
                    ),
                  },
                };
              }
              setCurrentSetlist((prev) => {
                if (!prev) return prev;
                const newItems = [...prev.items];
                // Insert at original position
                const insertAt = Math.min(deletedPosition, newItems.length);
                newItems.splice(insertAt, 0, reItem);
                return {
                  ...prev,
                  items: newItems,
                  songs:
                    isSongItem(reItem) && reItem._song
                      ? [...prev.songs, reItem._song]
                      : prev.songs,
                  updatedAt: new Date(),
                };
              });
            }
          },
          redo: async () => {
            // Re-delete
            const el = getElectron();
            setCurrentSetlist((prev) => {
              if (!prev) return prev;
              // Find by songId or type match since ID changes on re-add
              const itemToRemove = prev.items.find(
                (i) =>
                  (isSongItem(i) &&
                    isSongItem(captured) &&
                    i.songId === captured.songId) ||
                  i.id === captured.id,
              );
              if (!itemToRemove) return prev;
              return {
                ...prev,
                items: prev.items.filter((i) => i.id !== itemToRemove.id),
                songs: isSongItem(itemToRemove)
                  ? prev.songs.filter((s) => s.id !== itemToRemove.songId)
                  : prev.songs,
                updatedAt: new Date(),
              };
            });
            if (el?.sessionItem) {
              // Find current ID to delete from DB
              el.sessionItem.delete(captured.id).catch(() => {});
            }
          },
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSessionId, pushAction],
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
        .catch((err: unknown) => {
          console.error('Failed to check/add song:', err);
          toast.error('Failed to add song');
        });
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
      if (!currentSetlist) return;

      const itemToDelete = currentSetlist.items.find(
        (i) => isSongItem(i) && i.songId === songId,
      );

      if (itemToDelete) {
        deleteItem(itemToDelete.id);
      }
    },
    [currentSetlist, deleteItem],
  );

  const reorderSlides = useCallback(
    (itemIndex: number, fromIndex: number, toIndex: number) => {
      setCurrentSetlist((prev) =>
        withSongSlides(prev, itemIndex, (_song, slides) => {
          const newSlides = [...slides];
          const [removed] = newSlides.splice(fromIndex, 1);
          newSlides.splice(toIndex, 0, removed);
          return newSlides;
        }),
      );
    },
    [],
  );

  const duplicateSlide = useCallback(
    (itemIndex: number, slideIndex: number) => {
      setCurrentSetlist((prev) =>
        withSongSlides(prev, itemIndex, (_song, slides) => {
          if (!slides[slideIndex]) return null;
          const newSlide: Slide = {
            id: generateId(),
            lines: [...slides[slideIndex].lines],
          };
          const newSlides = [...slides];
          newSlides.splice(slideIndex + 1, 0, newSlide);
          return newSlides;
        }),
      );
    },
    [],
  );

  const deleteSlide = useCallback((itemIndex: number, slideIndex: number) => {
    setCurrentSetlist((prev) =>
      withSongSlides(prev, itemIndex, (_song, slides) =>
        slides.length <= 1 ? null : slides.filter((_, i) => i !== slideIndex),
      ),
    );
  }, []);

  const updateSlide = useCallback(
    (
      itemIndex: number,
      slideIndex: number,
      lines: string[],
      section?: string,
      overrides?: SlideOverrides,
      lineRoles?: ('body' | 'reference')[],
    ) => {
      setCurrentSetlist((prev) =>
        withSongSlides(prev, itemIndex, (_song, slides) => {
          if (!slides[slideIndex]) return null;
          const newSlides = [...slides];
          newSlides[slideIndex] = {
            ...newSlides[slideIndex],
            lines,
            section,
            fontSize: overrides?.fontSize,
            overrides,
            ...(lineRoles ? { lineRoles } : {}),
          };
          return newSlides;
        }),
      );
    },
    [],
  );

  const value = useMemo<SetlistContextType>(
    () => ({
      currentSetlist,
      // Unified item methods
      addItem,
      updateItem,
      deleteItem,
      reorderItems,
      getItemSlides,
      // Song convenience methods
      addSong,
      updateSong,
      deleteSong,
      reorderSlides,
      duplicateSlide,
      deleteSlide,
      updateSlide,
    }),
    [
      currentSetlist,
      addItem,
      updateItem,
      deleteItem,
      reorderItems,
      getItemSlides,
      addSong,
      updateSong,
      deleteSong,
      reorderSlides,
      duplicateSlide,
      deleteSlide,
      updateSlide,
    ],
  );

  return (
    <SetlistContext.Provider value={value}>{children}</SetlistContext.Provider>
  );
}
