/**
 * Advertisement types for OpenWorship
 * Supports both text and image advertisements with configurable display styles
 */

export type AdvertisementPosition = 'top' | 'middle' | 'bottom';

export interface AdvertisementPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Global display settings that apply to ALL advertisements
 */
export interface AdvertisementDisplaySettings {
  position: AdvertisementPosition;
  padding: AdvertisementPadding;
  backgroundTransparent: boolean;
  backgroundColor: string; // Used when not transparent
}

/**
 * Individual advertisement - only contains content-specific settings
 */
export interface Advertisement {
  id: string;
  type: 'image' | 'text';
  content: string; // Image path (for type='image') or text content (for type='text')
  displayStyle: 'fullscreen' | 'banner';
  // Text-specific settings
  textColor?: string;
  fontSize?: number;
  // Metadata
  duration?: number; // Duration in seconds for auto-rotation (0 = manual only)
  order: number; // Order for rotation sequence
  createdAt: string;
  updatedAt: string;
}

export interface AdvertisementState {
  isVisible: boolean;
  currentAd: Advertisement | null;
  isRotating: boolean;
  rotationInterval: number; // Seconds between ads during rotation
}

export interface AdvertisementCreateInput {
  type: 'image' | 'text';
  content: string;
  displayStyle: 'fullscreen' | 'banner';
  textColor?: string;
  fontSize?: number;
  duration?: number;
}

export interface AdvertisementUpdateInput {
  type?: 'image' | 'text';
  content?: string;
  displayStyle?: 'fullscreen' | 'banner';
  textColor?: string;
  fontSize?: number;
  duration?: number;
  order?: number;
}

export interface ProjectionAdvertisementMessage {
  action: 'show' | 'hide' | 'updateSettings';
  advertisement?: Advertisement;
  displaySettings?: AdvertisementDisplaySettings;
}

// Default display settings
export const DEFAULT_DISPLAY_SETTINGS: AdvertisementDisplaySettings = {
  position: 'bottom',
  padding: { top: 48, right: 64, bottom: 48, left: 64 },
  backgroundTransparent: false,
  backgroundColor: '#000000',
};
