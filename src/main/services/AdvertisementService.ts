/**
 * Advertisement Service for OpenWorship
 * Manages advertisement CRUD operations and global display settings using electron-store
 */

import Store from 'electron-store';
import log from 'electron-log';
import { v4 as uuidv4 } from 'uuid';
import {
  Advertisement,
  AdvertisementCreateInput,
  AdvertisementUpdateInput,
  AdvertisementDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
} from '../../shared/types/advertisement';

interface AdvertisementStore {
  advertisements: Advertisement[];
  rotationInterval: number; // seconds between ads during rotation
  displaySettings: AdvertisementDisplaySettings; // global display settings
}

const defaultStore: AdvertisementStore = {
  advertisements: [],
  rotationInterval: 10, // 10 seconds default
  displaySettings: DEFAULT_DISPLAY_SETTINGS,
};

const store = new Store<AdvertisementStore>({
  name: 'advertisements',
  defaults: defaultStore,
});

export const advertisementService = {
  /**
   * Get all advertisements
   */
  getAll(): Advertisement[] {
    return store.get('advertisements', []).sort((a, b) => a.order - b.order);
  },

  /**
   * Get advertisement by ID
   */
  getById(id: string): Advertisement | null {
    const ads = store.get('advertisements', []);
    return ads.find((ad) => ad.id === id) || null;
  },

  /**
   * Add a new advertisement
   */
  add(input: AdvertisementCreateInput): Advertisement {
    const ads = store.get('advertisements', []);
    const now = new Date().toISOString();

    const newAd: Advertisement = {
      id: uuidv4(),
      type: input.type,
      content: input.content,
      displayStyle: input.displayStyle,
      textColor: input.textColor || '#ffffff',
      fontSize: input.fontSize || 48,
      duration: input.duration || 0,
      order: ads.length, // Add to end
      createdAt: now,
      updatedAt: now,
    };

    ads.push(newAd);
    store.set('advertisements', ads);

    log.info('[Advertisement] Added advertisement:', newAd.id);
    return newAd;
  },

  /**
   * Update an advertisement
   */
  update(id: string, updates: AdvertisementUpdateInput): Advertisement | null {
    const ads = store.get('advertisements', []);
    const index = ads.findIndex((ad) => ad.id === id);

    if (index === -1) return null;

    const now = new Date().toISOString();
    const updatedAd: Advertisement = {
      ...ads[index],
      ...updates,
      updatedAt: now,
    };

    ads[index] = updatedAd;
    store.set('advertisements', ads);

    log.info('[Advertisement] Updated advertisement:', id);
    return updatedAd;
  },

  /**
   * Delete an advertisement
   */
  delete(id: string): boolean {
    const ads = store.get('advertisements', []);
    const index = ads.findIndex((ad) => ad.id === id);

    if (index === -1) return false;

    ads.splice(index, 1);

    // Re-order remaining ads
    ads.forEach((ad, i) => {
      ad.order = i;
    });

    store.set('advertisements', ads);

    log.info('[Advertisement] Deleted advertisement:', id);
    return true;
  },

  /**
   * Reorder advertisements
   */
  reorder(ids: string[]): boolean {
    const ads = store.get('advertisements', []);

    // Create a map for quick lookup
    const adMap = new Map(ads.map((ad) => [ad.id, ad]));

    // Reorder based on provided IDs
    const reorderedAds: Advertisement[] = [];
    ids.forEach((id, index) => {
      const ad = adMap.get(id);
      if (ad) {
        ad.order = index;
        ad.updatedAt = new Date().toISOString();
        reorderedAds.push(ad);
      }
    });

    // Add any ads not in the provided list (keep at end)
    ads.forEach((ad) => {
      if (!ids.includes(ad.id)) {
        ad.order = reorderedAds.length;
        reorderedAds.push(ad);
      }
    });

    store.set('advertisements', reorderedAds);

    log.info('[Advertisement] Reordered advertisements');
    return true;
  },

  /**
   * Get rotation interval
   */
  getRotationInterval(): number {
    return store.get('rotationInterval', 10);
  },

  /**
   * Set rotation interval
   */
  setRotationInterval(seconds: number): void {
    store.set('rotationInterval', seconds);
    log.info('[Advertisement] Set rotation interval:', seconds);
  },

  /**
   * Get global display settings
   */
  getDisplaySettings(): AdvertisementDisplaySettings {
    return store.get('displaySettings', DEFAULT_DISPLAY_SETTINGS);
  },

  /**
   * Update global display settings
   */
  setDisplaySettings(
    settings: Partial<AdvertisementDisplaySettings>,
  ): AdvertisementDisplaySettings {
    const currentSettings = store.get(
      'displaySettings',
      DEFAULT_DISPLAY_SETTINGS,
    );
    const updatedSettings: AdvertisementDisplaySettings = {
      ...currentSettings,
      ...settings,
    };
    store.set('displaySettings', updatedSettings);
    log.info('[Advertisement] Updated display settings:', updatedSettings);
    return updatedSettings;
  },

  /**
   * Clear all advertisements
   */
  clearAll(): void {
    store.set('advertisements', []);
    log.info('[Advertisement] Cleared all advertisements');
  },

  /**
   * Get the store path (for debugging)
   */
  getPath(): string {
    return store.path;
  },
};
