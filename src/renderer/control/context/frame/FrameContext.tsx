import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import {
  Frame,
  FrameSettings,
  FrameInput,
  FrameUpdateInput,
  defaultFrameSettings,
} from '../../../../shared/types/frame';
import { SetlistItemType } from '../../../../shared/types/setlistItem';

import { getElectron } from '../../../shared/hooks/useElectron';

interface FrameContextType {
  // State
  frames: Frame[];
  settings: FrameSettings;
  isLoading: boolean;

  // Frame operations
  loadFrames: () => Promise<void>;
  getFrame: (id: string) => Promise<Frame | null>;
  addFrame: (input: FrameInput) => Promise<Frame | null>;
  updateFrame: (id: string, updates: FrameUpdateInput) => Promise<Frame | null>;
  deleteFrame: (id: string) => Promise<boolean>;
  importFrameImage: () => Promise<string | null>;

  // Settings operations
  loadSettings: () => Promise<void>;
  setFrameForType: (
    type: SetlistItemType,
    frameId: string | null,
  ) => Promise<void>;
  getFrameForType: (type: SetlistItemType) => Frame | null;

  // Projection
  sendFrameToProjection: (
    frame: Frame | null,
    itemType: SetlistItemType,
  ) => void;
}

const FrameContext = createContext<FrameContextType | null>(null);

export function useFrame() {
  const context = useContext(FrameContext);
  if (!context) {
    throw new Error('useFrame must be used within a FrameProvider');
  }
  return context;
}

interface FrameProviderProps {
  children: ReactNode;
}

export function FrameProvider({ children }: FrameProviderProps) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [settings, setSettings] = useState<FrameSettings>(defaultFrameSettings);
  const [isLoading, setIsLoading] = useState(false);

  // Load frames and settings on mount
  useEffect(() => {
    loadFrames();
    loadSettings();
  }, []);

  const loadFrames = useCallback(async () => {
    const electron = getElectron();
    if (!electron?.frame) return;

    try {
      setIsLoading(true);
      const result = await electron.frame.getAll();
      if (result.success && result.data) {
        setFrames(result.data);
      }
    } catch (error) {
      console.error('Failed to load frames:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getFrame = useCallback(async (id: string): Promise<Frame | null> => {
    const electron = getElectron();
    if (!electron?.frame) return null;

    try {
      const result = await electron.frame.getById(id);
      return result.success && result.data ? result.data : null;
    } catch (error) {
      console.error('Failed to get frame:', error);
      return null;
    }
  }, []);

  const addFrame = useCallback(
    async (input: FrameInput): Promise<Frame | null> => {
      const electron = getElectron();
      if (!electron?.frame) return null;

      try {
        setIsLoading(true);
        const result = await electron.frame.add(input);
        if (result.success && result.data) {
          await loadFrames();
          return result.data;
        }
        return null;
      } catch (error) {
        console.error('Failed to add frame:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [loadFrames],
  );

  const updateFrame = useCallback(
    async (id: string, updates: FrameUpdateInput): Promise<Frame | null> => {
      const electron = getElectron();
      if (!electron?.frame) return null;

      try {
        setIsLoading(true);
        const result = await electron.frame.update(id, updates);
        if (result.success && result.data) {
          await loadFrames();
          return result.data;
        }
        return null;
      } catch (error) {
        console.error('Failed to update frame:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [loadFrames],
  );

  const deleteFrame = useCallback(
    async (id: string): Promise<boolean> => {
      const electron = getElectron();
      if (!electron?.frame) return false;

      try {
        setIsLoading(true);
        const result = await electron.frame.delete(id);
        if (result.success && result.data) {
          await loadFrames();
          // Clear from settings if this frame was assigned
          const newSettings = { ...settings };
          if (settings.songFrameId === id) newSettings.songFrameId = null;
          if (settings.bibleFrameId === id) newSettings.bibleFrameId = null;
          if (settings.announcementFrameId === id)
            newSettings.announcementFrameId = null;
          if (
            newSettings.songFrameId !== settings.songFrameId ||
            newSettings.bibleFrameId !== settings.bibleFrameId ||
            newSettings.announcementFrameId !== settings.announcementFrameId
          ) {
            await electron.frame.setSettings(newSettings);
            setSettings(newSettings);
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to delete frame:', error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [loadFrames, settings],
  );

  const importFrameImage = useCallback(async (): Promise<string | null> => {
    const electron = getElectron();
    if (!electron?.frame) return null;

    try {
      const result = await electron.frame.importImage();
      if (result.success && result.data && !result.canceled) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to import frame image:', error);
      return null;
    }
  }, []);

  const loadSettings = useCallback(async () => {
    const electron = getElectron();
    if (!electron?.frame) return;

    try {
      const result = await electron.frame.getSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Failed to load frame settings:', error);
    }
  }, []);

  const setFrameForType = useCallback(
    async (type: SetlistItemType, frameId: string | null) => {
      const electron = getElectron();
      if (!electron?.frame) return;

      try {
        const updates: Partial<FrameSettings> = {};
        switch (type) {
          case 'song':
            updates.songFrameId = frameId;
            break;
          case 'bible':
            updates.bibleFrameId = frameId;
            break;
          case 'announcement':
            updates.announcementFrameId = frameId;
            break;
          default:
            break;
        }

        const result = await electron.frame.setSettings(updates);
        if (result.success && result.data) {
          setSettings(result.data);
        }
      } catch (error) {
        console.error('Failed to set frame for type:', error);
      }
    },
    [],
  );

  const getFrameForType = useCallback(
    (type: SetlistItemType): Frame | null => {
      let frameId: string | null = null;
      switch (type) {
        case 'song':
          frameId = settings.songFrameId;
          break;
        case 'bible':
          frameId = settings.bibleFrameId;
          break;
        case 'announcement':
          frameId = settings.announcementFrameId;
          break;
        default:
          break;
      }

      if (!frameId) return null;
      return frames.find((f) => f.id === frameId) || null;
    },
    [frames, settings],
  );

  const sendFrameToProjection = useCallback(
    (frame: Frame | null, itemType: SetlistItemType) => {
      const electron = getElectron();
      if (!electron?.frame) return;

      electron.frame.sendToProjection(frame, itemType);
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      // State
      frames,
      settings,
      isLoading,

      // Frame operations
      loadFrames,
      getFrame,
      addFrame,
      updateFrame,
      deleteFrame,
      importFrameImage,

      // Settings operations
      loadSettings,
      setFrameForType,
      getFrameForType,

      // Projection
      sendFrameToProjection,
    }),
    [
      frames,
      settings,
      isLoading,
      loadFrames,
      getFrame,
      addFrame,
      updateFrame,
      deleteFrame,
      importFrameImage,
      loadSettings,
      setFrameForType,
      getFrameForType,
      sendFrameToProjection,
    ],
  );

  return (
    <FrameContext.Provider value={contextValue}>
      {children}
    </FrameContext.Provider>
  );
}
