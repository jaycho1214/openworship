/**
 * Settings Service for OpenWorship
 * Uses electron-store for persistence and safeStorage for API key encryption
 */

import Store from 'electron-store';
import { safeStorage } from 'electron';
import log from 'electron-log';

// Settings schema
interface ProjectionSettings {
  fontSize: number;
  textColor: string;
  textShadow: {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  textOutline: {
    enabled: boolean;
    width: number;
    color: string;
  };
  backgroundDim: number;
  animation: 'none' | 'fade' | 'slide-up' | 'slide-left';
  displayMode: 'fullscreen' | 'windowed';
  textAlign: {
    horizontal: 'left' | 'center' | 'right';
    vertical: 'top' | 'middle' | 'bottom';
  };
  padding: {
    top: number; // percentage 0-20
    bottom: number;
    left: number;
    right: number;
  };
}

interface AppSettings {
  apiKey: string; // Encrypted
  language: 'en' | 'ko';
  theme: 'light' | 'dark' | 'system';
  projection: ProjectionSettings;
  assetsMigrated: boolean;
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
};

const defaultSettings: AppSettings = {
  apiKey: '',
  language: 'ko',
  theme: 'system',
  projection: defaultProjectionSettings,
  assetsMigrated: false,
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
        fontSize: { type: 'number', minimum: 24, maximum: 200 },
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
  },
});

/**
 * Encrypt a string using Electron's safeStorage
 */
function encryptString(value: string): string {
  if (!value) return '';

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value);
      return encrypted.toString('base64');
    }
    // Fallback: store as-is if encryption not available (dev mode)
    log.warn(
      '[Settings] Encryption not available, storing API key unencrypted',
    );
    return `plain:${value}`;
  } catch (error) {
    log.error('[Settings] Failed to encrypt:', error);
    return `plain:${value}`;
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
  getLanguage(): 'en' | 'ko' {
    return store.get('language', 'ko');
  },

  /**
   * Set language setting
   */
  setLanguage(language: 'en' | 'ko'): void {
    store.set('language', language);
    log.info('[Settings] Language set to:', language);
  },

  /**
   * Get theme setting
   */
  getTheme(): 'light' | 'dark' | 'system' {
    return store.get('theme', 'dark');
  },

  /**
   * Set theme setting
   */
  setTheme(theme: 'light' | 'dark' | 'system'): void {
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

export type { AppSettings, ProjectionSettings };
export { defaultProjectionSettings, defaultSettings };
