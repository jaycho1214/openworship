/**
 * Frame system types for OpenWorship
 * Decorative frames/borders for projection content
 */

import { SetlistItemType } from './setlistItem';

/**
 * Frame type - image (9-slice) or CSS-based
 */
export type FrameType = 'image' | 'css';

/**
 * Padding configuration for frames
 */
export interface FramePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Frame definition
 */
export interface Frame {
  /** Unique identifier */
  id: string;
  /** Display name for the frame */
  name: string;
  /** Frame type */
  type: FrameType;

  // Image frame properties (9-slice)
  /** Path to the frame image (for image type) */
  imagePath?: string;
  /** Slice size in pixels for 9-slice rendering (for image type) */
  sliceSize?: number;

  // CSS frame properties
  /** Border width in pixels (for CSS type) */
  borderWidth?: number;
  /** Border color (for CSS type) */
  borderColor?: string;
  /** Border radius in pixels (for CSS type) */
  borderRadius?: number;
  /** Background color (for CSS type) */
  backgroundColor?: string;
  /** Box shadow CSS value (for CSS type) */
  boxShadow?: string;

  // Common properties
  /** Content padding inside the frame */
  padding?: FramePadding;

  /** When this frame was created */
  createdAt: string;
  /** When this frame was last updated */
  updatedAt: string;
}

/**
 * Frame assignments per content type
 */
export interface FrameSettings {
  /** Frame ID for song content, or null for no frame */
  songFrameId: string | null;
  /** Frame ID for Bible verse content, or null for no frame */
  bibleFrameId: string | null;
  /** Frame ID for announcement content, or null for no frame */
  announcementFrameId: string | null;
}

/**
 * Default frame settings
 */
export const defaultFrameSettings: FrameSettings = {
  songFrameId: null,
  bibleFrameId: null,
  announcementFrameId: null,
};

/**
 * Input for creating a new image frame
 */
export interface ImageFrameInput {
  type: 'image';
  name: string;
  imagePath: string;
  sliceSize: number;
  padding?: FramePadding;
}

/**
 * Input for creating a new CSS frame
 */
export interface CssFrameInput {
  type: 'css';
  name: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  backgroundColor?: string;
  boxShadow?: string;
  padding?: FramePadding;
}

/**
 * Union type for frame inputs
 */
export type FrameInput = ImageFrameInput | CssFrameInput;

/**
 * Update input for frames
 */
export interface FrameUpdateInput {
  name?: string;
  sliceSize?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  backgroundColor?: string;
  boxShadow?: string;
  padding?: FramePadding;
}

/**
 * Get the frame ID for a given content type
 */
export function getFrameIdForType(
  settings: FrameSettings,
  type: SetlistItemType,
): string | null {
  switch (type) {
    case 'song':
      return settings.songFrameId;
    case 'bible':
      return settings.bibleFrameId;
    case 'announcement':
      return settings.announcementFrameId;
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-underscore-dangle
      const _exhaustive: never = type;
      return null;
    }
  }
}
