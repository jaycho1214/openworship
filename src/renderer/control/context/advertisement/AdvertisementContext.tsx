import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import {
  Advertisement,
  AdvertisementCreateInput,
  AdvertisementUpdateInput,
  AdvertisementDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
} from '../../../../shared/types/advertisement';

import { getElectron } from '../../../shared/hooks/useElectron';

interface AdvertisementContextType {
  // Advertisement list
  advertisements: Advertisement[];
  loadAdvertisements: () => Promise<void>;
  addAdvertisement: (
    input: AdvertisementCreateInput,
  ) => Promise<Advertisement | null>;
  updateAdvertisement: (
    id: string,
    updates: AdvertisementUpdateInput,
  ) => Promise<Advertisement | null>;
  deleteAdvertisement: (id: string) => Promise<boolean>;
  reorderAdvertisements: (ids: string[]) => Promise<boolean>;

  // Display settings (global)
  displaySettings: AdvertisementDisplaySettings;
  updateDisplaySettings: (
    settings: Partial<AdvertisementDisplaySettings>,
  ) => Promise<void>;

  // Display state
  isAdVisible: boolean;
  currentAd: Advertisement | null;
  showAdvertisement: (ad: Advertisement) => void;
  hideAdvertisement: () => void;

  // Rotation
  isRotating: boolean;
  rotationInterval: number;
  setRotationInterval: (seconds: number) => void;
  startRotation: () => void;
  stopRotation: () => void;

  // Loading state
  isLoading: boolean;
}

const AdvertisementContext = createContext<AdvertisementContextType | null>(
  null,
);

export function useAdvertisement() {
  const context = useContext(AdvertisementContext);
  if (!context) {
    throw new Error(
      'useAdvertisement must be used within an AdvertisementProvider',
    );
  }
  return context;
}

interface AdvertisementProviderProps {
  children: ReactNode;
}

export function AdvertisementProvider({
  children,
}: AdvertisementProviderProps) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [displaySettings, setDisplaySettings] =
    useState<AdvertisementDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [isAdVisible, setIsAdVisible] = useState(false);
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationInterval, setRotationIntervalState] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAdIndexRef = useRef(0);
  const advertisementsRef = useRef<Advertisement[]>([]);

  // Keep ref in sync with state for use in interval callbacks
  advertisementsRef.current = advertisements;

  // Load advertisements and display settings
  const loadAdvertisements = useCallback(async () => {
    const electron = getElectron();
    if (!electron?.advertisement) return;

    setIsLoading(true);
    try {
      const [adsResult, settingsResult] = await Promise.all([
        electron.advertisement.getAll(),
        electron.advertisement.getDisplaySettings(),
      ]);

      if (adsResult.success && adsResult.data) {
        setAdvertisements(adsResult.data);
      }
      if (settingsResult.success && settingsResult.data) {
        setDisplaySettings(settingsResult.data);
      }
    } catch (error) {
      console.error('[Advertisement] Failed to load advertisements:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadAdvertisements();
  }, [loadAdvertisements]);

  // Update display settings
  const updateDisplaySettings = useCallback(
    async (settings: Partial<AdvertisementDisplaySettings>): Promise<void> => {
      const electron = getElectron();
      if (!electron?.advertisement) return;

      try {
        const result =
          await electron.advertisement.setDisplaySettings(settings);
        if (result.success && result.data) {
          setDisplaySettings(result.data);
        }
      } catch (error) {
        console.error(
          '[Advertisement] Failed to update display settings:',
          error,
        );
      }
    },
    [],
  );

  // Add advertisement
  const addAdvertisement = useCallback(
    async (input: AdvertisementCreateInput): Promise<Advertisement | null> => {
      const electron = getElectron();
      if (!electron?.advertisement) return null;

      try {
        const result = await electron.advertisement.add(input);
        if (result.success && result.data) {
          setAdvertisements((prev) => [...prev, result.data!]);
          return result.data;
        }
      } catch (error) {
        console.error('[Advertisement] Failed to add advertisement:', error);
      }
      return null;
    },
    [],
  );

  // Update advertisement
  const updateAdvertisement = useCallback(
    async (
      id: string,
      updates: AdvertisementUpdateInput,
    ): Promise<Advertisement | null> => {
      const electron = getElectron();
      if (!electron?.advertisement) return null;

      try {
        const result = await electron.advertisement.update(id, updates);
        if (result.success && result.data) {
          setAdvertisements((prev) =>
            prev.map((ad) => (ad.id === id ? result.data! : ad)),
          );
          // Update current ad if it's being displayed
          if (currentAd?.id === id) {
            setCurrentAd(result.data);
          }
          return result.data;
        }
      } catch (error) {
        console.error('[Advertisement] Failed to update advertisement:', error);
      }
      return null;
    },
    [currentAd],
  );

  // Delete advertisement
  const deleteAdvertisement = useCallback(
    async (id: string): Promise<boolean> => {
      const electron = getElectron();
      if (!electron?.advertisement) return false;

      try {
        const result = await electron.advertisement.delete(id);
        if (result.success) {
          setAdvertisements((prev) => prev.filter((ad) => ad.id !== id));
          // Hide if currently displayed
          if (currentAd?.id === id) {
            hideAdvertisement();
          }
          return true;
        }
      } catch (error) {
        console.error('[Advertisement] Failed to delete advertisement:', error);
      }
      return false;
    },
    [currentAd],
  );

  // Reorder advertisements
  const reorderAdvertisements = useCallback(
    async (ids: string[]): Promise<boolean> => {
      const electron = getElectron();
      if (!electron?.advertisement) return false;

      try {
        const result = await electron.advertisement.reorder(ids);
        if (result.success) {
          // Reorder local state
          const reordered = ids
            .map((id) => advertisements.find((ad) => ad.id === id))
            .filter((ad): ad is Advertisement => ad !== undefined);
          setAdvertisements(reordered);
          return true;
        }
      } catch (error) {
        console.error(
          '[Advertisement] Failed to reorder advertisements:',
          error,
        );
      }
      return false;
    },
    [advertisements],
  );

  // Show advertisement
  const showAdvertisement = useCallback(
    (ad: Advertisement) => {
      const electron = getElectron();
      if (!electron?.advertisement) {
        console.error('[Advertisement] electron.advertisement not available');
        return;
      }

      setCurrentAd(ad);
      setIsAdVisible(true);
      electron.advertisement.show(ad, displaySettings);
    },
    [displaySettings],
  );

  // Hide advertisement
  const hideAdvertisement = useCallback(() => {
    const electron = getElectron();
    if (!electron?.advertisement) return;

    setIsAdVisible(false);
    electron.advertisement.hide();
  }, []);

  // Set rotation interval
  const setRotationInterval = useCallback((seconds: number) => {
    setRotationIntervalState(seconds);
  }, []);

  // Start rotation
  const startRotation = useCallback(() => {
    if (advertisementsRef.current.length === 0) return;

    setIsRotating(true);
    currentAdIndexRef.current = 0;

    // Show first ad immediately
    showAdvertisement(advertisementsRef.current[0]);

    // Start timer for rotation (use ref to avoid stale closure)
    rotationTimerRef.current = setInterval(() => {
      const ads = advertisementsRef.current;
      if (ads.length === 0) return;
      currentAdIndexRef.current = (currentAdIndexRef.current + 1) % ads.length;
      const nextAd = ads[currentAdIndexRef.current];
      showAdvertisement(nextAd);
    }, rotationInterval * 1000);
  }, [rotationInterval, showAdvertisement]);

  // Stop rotation
  const stopRotation = useCallback(() => {
    setIsRotating(false);
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    hideAdvertisement();
  }, [hideAdvertisement]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
    };
  }, []);

  // Listen for projection:ready to resync advertisement state
  useEffect(() => {
    const electron = getElectron();
    if (!electron?.projection?.onReady) return;

    const unsubscribe = electron.projection.onReady(() => {
      // If an advertisement is currently visible, resend it to the projection window
      if (isAdVisible && currentAd) {
        electron.advertisement?.show(currentAd, displaySettings);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAdVisible, currentAd, displaySettings]);

  // Update rotation timer when interval or ads change
  useEffect(() => {
    if (isRotating && rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = setInterval(() => {
        const ads = advertisementsRef.current;
        if (ads.length === 0) return;
        currentAdIndexRef.current =
          (currentAdIndexRef.current + 1) % ads.length;
        const nextAd = ads[currentAdIndexRef.current];
        if (nextAd) {
          showAdvertisement(nextAd);
        }
      }, rotationInterval * 1000);
    }
  }, [rotationInterval, advertisements.length, isRotating, showAdvertisement]);

  const contextValue = useMemo(
    () => ({
      advertisements,
      loadAdvertisements,
      addAdvertisement,
      updateAdvertisement,
      deleteAdvertisement,
      reorderAdvertisements,
      displaySettings,
      updateDisplaySettings,
      isAdVisible,
      currentAd,
      showAdvertisement,
      hideAdvertisement,
      isRotating,
      rotationInterval,
      setRotationInterval,
      startRotation,
      stopRotation,
      isLoading,
    }),
    [
      advertisements,
      loadAdvertisements,
      addAdvertisement,
      updateAdvertisement,
      deleteAdvertisement,
      reorderAdvertisements,
      displaySettings,
      updateDisplaySettings,
      isAdVisible,
      currentAd,
      showAdvertisement,
      hideAdvertisement,
      isRotating,
      rotationInterval,
      setRotationInterval,
      startRotation,
      stopRotation,
      isLoading,
    ],
  );

  return (
    <AdvertisementContext.Provider value={contextValue}>
      {children}
    </AdvertisementContext.Provider>
  );
}
