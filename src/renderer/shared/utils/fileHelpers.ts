/**
 * Shared file utilities for OCR import (AddSongDialog + SongEditor).
 */

const IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'tiff',
  'tif',
];

/** Check if a File is an image (by MIME type or extension fallback). */
export const isImageFile = (file: File): boolean => {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.toLowerCase().split('.').pop();
  return IMAGE_EXTENSIONS.includes(ext || '');
};

/**
 * Check if a File is a PDF.
 * Checks both MIME type and extension — Windows drag-drop may report empty type.
 */
export const isPdfFile = (file: File): boolean => {
  if (file.type === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
};

/** Check if a File can be processed by OCR (image or PDF). */
export const isOcrFile = (file: File): boolean =>
  isImageFile(file) || isPdfFile(file);

/** Max file size for OCR: 40 MB (OpenAI limit is ~50 MB; base64 inflates ~33%). */
export const MAX_OCR_FILE_SIZE = 40 * 1024 * 1024;

/** Read a File as a base64 string (data URI prefix stripped). */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:…;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Get the effective MIME type for a file.
 * Falls back based on extension when file.type is empty (common on Windows).
 */
export const getFileMimeType = (file: File): string => {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith('.pdf')) return 'application/pdf';
  return 'image/png';
};
