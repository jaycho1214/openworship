/**
 * Font utilities for the main process
 * Handles font file detection, naming, and format detection
 */
import path from 'path';

// Supported font extensions and their format types
export const fontExtensions: Record<string, 'truetype' | 'woff' | 'woff2'> = {
  '.ttf': 'truetype',
  '.otf': 'truetype',
  '.woff': 'woff',
  '.woff2': 'woff2',
};

/**
 * Clean up font filename to extract a readable font name
 * Removes common suffixes like -Regular, _Bold, etc.
 */
export function cleanFontName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, ext);

  return (
    baseName
      .replace(
        /[-_](Regular|Bold|Light|Medium|SemiBold|ExtraBold|Thin|Black|Italic)/gi,
        '',
      )
      .replace(/[-_]/g, ' ')
      .trim() || baseName
  );
}

/**
 * Get MIME type for a font format
 */
export function getFontMimeType(format: 'truetype' | 'woff' | 'woff2'): string {
  switch (format) {
    case 'woff2':
      return 'font/woff2';
    case 'woff':
      return 'font/woff';
    default:
      return 'font/truetype';
  }
}

/**
 * Get font format from file extension
 * Returns undefined if not a supported font file
 */
export function getFontFormat(
  fileName: string,
): 'truetype' | 'woff' | 'woff2' | undefined {
  const ext = path.extname(fileName).toLowerCase();
  return fontExtensions[ext];
}

/**
 * Check if a file is a supported font file
 */
export function isFontFile(fileName: string): boolean {
  return getFontFormat(fileName) !== undefined;
}
