/**
 * Settings Service for OpenWorship
 * Uses electron-store for persistence and safeStorage for API key encryption
 */

import Store from 'electron-store';
import { app, safeStorage } from 'electron';
import log from 'electron-log';
import {
  ProjectionSettings,
  ThemeMode,
  Language,
  ContentTypeTextSettings,
  TextStyleSettings,
  BibleReferenceStyle,
  defaultContentTypeTextSettings,
  defaultTextStyleSettings,
  defaultBibleReferenceStyle,
  RecentItem,
  RecentItemInput,
  RecentSongItem,
  RecentBibleItem,
} from '../../shared/types/settings';
import { FrameSettings, defaultFrameSettings } from '../../shared/types/frame';

interface AppSettings {
  apiKey: string; // Encrypted
  language: Language;
  theme: ThemeMode;
  projection: ProjectionSettings;
  assetsMigrated: boolean;
  frameSettings: FrameSettings;
  recentItems: RecentItem[];
  contentTypeText: ContentTypeTextSettings;
}

const defaultProjectionSettings: ProjectionSettings = {
  fontSize: 72,
  textColor: '#ffffff',
  textShadow: {
    enabled: true,
    offsetX: 0,
    offsetY: 0,
    blur: 8,
    color: 'rgba(0,0,0,0.9)',
  },
  textOutline: {
    enabled: false,
    width: 2,
    color: '#000000',
  },
  backgroundDim: 0,
  animation: 'fade',
  displayMode: 'fullscreen',
  textAlign: {
    horizontal: 'center',
    vertical: 'middle',
  },
  padding: {
    top: 5,
    bottom: 5,
    left: 5,
    right: 5,
  },
  backgroundType: 'video',
  backgroundColor: '#000000',
  backgroundImagePath: undefined,
};

const defaultSettings: AppSettings = {
  apiKey: '',
  language: 'ko',
  theme: 'system',
  projection: defaultProjectionSettings,
  assetsMigrated: false,
  frameSettings: defaultFrameSettings,
  recentItems: [],
  contentTypeText: defaultContentTypeTextSettings,
};

// Create store with schema validation
const store = new Store<AppSettings>({
  name: 'settings',
  defaults: defaultSettings,
  schema: {
    apiKey: { type: 'string' },
    language: { type: 'string', enum: ['en', 'ko'] },
    theme: { type: 'string', enum: ['light', 'dark', 'system'] },
    projection: {
      type: 'object',
      properties: {
        fontSize: { type: 'number', minimum: 24, maximum: 360 },
        textColor: { type: 'string' },
        textShadow: { type: 'object' },
        textOutline: { type: 'object' },
        backgroundDim: { type: 'number', minimum: 0, maximum: 100 },
        animation: { type: 'string' },
        displayMode: { type: 'string' },
        textAlign: { type: 'object' },
      },
    },
    assetsMigrated: { type: 'boolean' },
    frameSettings: {
      type: 'object',
      properties: {
        songFrameId: { type: ['string', 'null'] },
        bibleFrameId: { type: ['string', 'null'] },
        announcementFrameId: { type: ['string', 'null'] },
      },
    },
    recentItems: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
    contentTypeText: {
      type: 'object',
    },
  },
});

/**
 * Encrypt a string using Electron's safeStorage
 */
function encryptString(value: string): string {
  if (!value) return '';

  try {
    if (safeStorage.isEncryptionAvailable()) {
      // Warn if the backend is plaintext (Linux without a keyring)
      const backend = safeStorage.getSelectedStorageBackend?.();
      if (backend === 'basic_text') {
        log.warn(
          '[Settings] safeStorage is using the basic_text backend — API key will be stored with weak encryption. Install a keyring (gnome-keyring, kwallet) for stronger protection.',
        );
      }
      const encrypted = safeStorage.encryptString(value);
      return encrypted.toString('base64');
    }
    // Fallback: only allow plaintext in dev mode
    if (!app.isPackaged) {
      log.warn(
        '[Settings] Encryption not available (dev mode), storing API key unencrypted',
      );
      return `plain:${value}`;
    }
    log.error(
      '[Settings] Encryption not available in production, refusing to store API key',
    );
    return '';
  } catch (error) {
    log.error('[Settings] Failed to encrypt:', error);
    if (!app.isPackaged) {
      return `plain:${value}`;
    }
    return '';
  }
}

/**
 * Decrypt a string using Electron's safeStorage
 */
function decryptString(value: string): string {
  if (!value) return '';

  try {
    // Handle plaintext fallback
    if (value.startsWith('plain:')) {
      return value.slice(6);
    }

    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(value, 'base64');
      return safeStorage.decryptString(buffer);
    }

    return '';
  } catch (error) {
    log.error('[Settings] Failed to decrypt:', error);
    return '';
  }
}

// Settings Service API
export const settingsService = {
  /**
   * Get the OpenAI API key (decrypted)
   */
  getApiKey(): string {
    const encrypted = store.get('apiKey', '');
    return decryptString(encrypted);
  },

  /**
   * Set the OpenAI API key (encrypted)
   */
  setApiKey(apiKey: string): void {
    const encrypted = encryptString(apiKey);
    store.set('apiKey', encrypted);
    log.info('[Settings] API key updated');
  },

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return !!this.getApiKey();
  },

  /**
   * Get language setting
   */
  getLanguage(): Language {
    return store.get('language', 'ko');
  },

  /**
   * Set language setting
   */
  setLanguage(language: Language): void {
    store.set('language', language);
    log.info('[Settings] Language set to:', language);
  },

  /**
   * Get theme setting
   */
  getTheme(): ThemeMode {
    return store.get('theme', 'system');
  },

  /**
   * Set theme setting
   */
  setTheme(theme: ThemeMode): void {
    store.set('theme', theme);
    log.info('[Settings] Theme set to:', theme);
  },

  /**
   * Get projection settings
   */
  getProjectionSettings(): ProjectionSettings {
    return store.get('projection', defaultProjectionSettings);
  },

  /**
   * Set projection settings
   */
  setProjectionSettings(settings: Partial<ProjectionSettings>): void {
    const current = this.getProjectionSettings();
    store.set('projection', { ...current, ...settings });
    log.info('[Settings] Projection settings updated');
  },

  /**
   * Get all settings (with API key decrypted)
   */
  getAllSettings(): Omit<AppSettings, 'apiKey'> & { hasApiKey: boolean } {
    return {
      hasApiKey: this.hasApiKey(),
      language: this.getLanguage(),
      theme: this.getTheme(),
      projection: this.getProjectionSettings(),
      assetsMigrated: store.get('assetsMigrated', false),
      frameSettings: this.getFrameSettings(),
      recentItems: this.getRecentItems(),
      contentTypeText: this.getContentTypeTextSettings(),
    };
  },

  /**
   * Check if assets have been migrated
   */
  getAssetsMigrated(): boolean {
    return store.get('assetsMigrated', false);
  },

  /**
   * Mark assets as migrated
   */
  setAssetsMigrated(migrated: boolean): void {
    store.set('assetsMigrated', migrated);
  },

  /**
   * Get frame settings
   */
  getFrameSettings(): FrameSettings {
    return store.get('frameSettings', defaultFrameSettings);
  },

  /**
   * Set frame settings
   */
  setFrameSettings(settings: Partial<FrameSettings>): FrameSettings {
    const current = this.getFrameSettings();
    const updated = { ...current, ...settings };
    store.set('frameSettings', updated);
    log.info('[Settings] Frame settings updated');
    return updated;
  },

  /**
   * Get recent items
   */
  getRecentItems(): RecentItem[] {
    return store.get('recentItems', []);
  },

  /**
   * Add a recent item (maintains max 10 items, deduplicates)
   */
  addRecentItem(item: RecentItemInput): void {
    const MAX_RECENT_ITEMS = 10;
    const current = this.getRecentItems();

    // Create new item with timestamp
    const newItem = { ...item, addedAt: Date.now() } as RecentItem;

    // Remove duplicates based on type and unique identifier
    const filtered = current.filter((existing) => {
      if (item.type === 'song' && existing.type === 'song') {
        return existing.songId !== item.songId;
      }
      if (item.type === 'bible' && existing.type === 'bible') {
        return existing.reference !== item.reference;
      }
      return true;
    });

    // Add new item at the beginning and limit to max
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    store.set('recentItems', updated);
    log.info('[Settings] Recent item added:', item.type);
  },

  /**
   * Clear recent items
   */
  clearRecentItems(): void {
    store.set('recentItems', []);
    log.info('[Settings] Recent items cleared');
  },

  /**
   * Get content-type text settings (migrates from global on first read)
   */
  getContentTypeTextSettings(): ContentTypeTextSettings {
    const stored = store.get('contentTypeText') as
      | ContentTypeTextSettings
      | undefined;
    if (stored?.song && stored?.bible && stored?.announcement) {
      return stored;
    }
    // Migrate from existing global projection settings
    const projection = this.getProjectionSettings();
    const migratedBase: TextStyleSettings = {
      fontSize: projection.fontSize ?? defaultTextStyleSettings.fontSize,
      textColor: projection.textColor ?? defaultTextStyleSettings.textColor,
      textShadow: projection.textShadow ?? defaultTextStyleSettings.textShadow,
      textOutline:
        projection.textOutline ?? defaultTextStyleSettings.textOutline,
      textAlign: projection.textAlign ?? defaultTextStyleSettings.textAlign,
      textJustify:
        projection.textJustify ?? defaultTextStyleSettings.textJustify,
      lineGap: projection.lineGap ?? defaultTextStyleSettings.lineGap,
      padding: projection.padding ?? defaultTextStyleSettings.padding,
    };
    const migrated: ContentTypeTextSettings = {
      song: { ...migratedBase },
      bible: {
        ...migratedBase,
        referenceStyle: { ...defaultBibleReferenceStyle },
      },
      announcement: { ...migratedBase },
    };
    store.set('contentTypeText', migrated);
    log.info(
      '[Settings] Migrated global text settings to per-content-type settings',
    );
    return migrated;
  },

  /**
   * Update text settings for a specific content type
   */
  setContentTypeTextSettings(
    type: 'song' | 'bible' | 'announcement',
    updates: Partial<TextStyleSettings>,
  ): ContentTypeTextSettings {
    const current = this.getContentTypeTextSettings();
    const updated = {
      ...current,
      [type]: { ...current[type], ...updates },
    };
    store.set('contentTypeText', updated);
    log.info(`[Settings] Content type text settings updated for: ${type}`);
    return updated;
  },

  /**
   * Update Bible reference style
   */
  setBibleReferenceStyle(
    updates: Partial<BibleReferenceStyle>,
  ): ContentTypeTextSettings {
    const current = this.getContentTypeTextSettings();
    const updated: ContentTypeTextSettings = {
      ...current,
      bible: {
        ...current.bible,
        referenceStyle: { ...current.bible.referenceStyle, ...updates },
      },
    };
    store.set('contentTypeText', updated);
    log.info('[Settings] Bible reference style updated');
    return updated;
  },

  /**
   * Reset all settings to defaults
   */
  resetAll(): void {
    store.clear();
    log.info('[Settings] All settings reset to defaults');
  },

  /**
   * Get the settings file path (for debugging)
   */
  getPath(): string {
    return store.path;
  },
};

export type {
  ProjectionSettings,
  ContentTypeTextSettings,
  TextStyleSettings,
  BibleTextStyleSettings,
  BibleReferenceStyle,
} from '../../shared/types/settings';
export type { AppSettings, RecentItem, RecentSongItem, RecentBibleItem };
export {
  defaultProjectionSettings,
  defaultSettings,
  defaultContentTypeTextSettings,
  defaultTextStyleSettings,
  defaultBibleReferenceStyle,
};
