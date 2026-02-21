import type { CSSProperties } from 'react';
import type { Frame } from '../../../shared/types/frame';

/**
 * Get frame style for CSS rendering
 */
export function getFrameStyle(frame: Frame | null): CSSProperties {
  if (!frame) return {};

  if (frame.type === 'image' && frame.imagePath) {
    return {
      borderImageSource: `url('file://${frame.imagePath.replace(/\\/g, '/')}')`,
      borderImageSlice: `${frame.sliceSize || 30} fill`,
      borderImageWidth: `${frame.sliceSize || 30}px`,
      borderImageRepeat: 'stretch',
      padding: frame.padding
        ? `${frame.padding.top}px ${frame.padding.right}px ${frame.padding.bottom}px ${frame.padding.left}px`
        : undefined,
    };
  }

  if (frame.type === 'css') {
    return {
      border:
        frame.borderWidth && frame.borderColor
          ? `${frame.borderWidth}px solid ${frame.borderColor}`
          : undefined,
      borderRadius: frame.borderRadius ? `${frame.borderRadius}px` : undefined,
      backgroundColor: frame.backgroundColor,
      boxShadow: frame.boxShadow,
      padding: frame.padding
        ? `${frame.padding.top}px ${frame.padding.right}px ${frame.padding.bottom}px ${frame.padding.left}px`
        : undefined,
    };
  }

  return {};
}
