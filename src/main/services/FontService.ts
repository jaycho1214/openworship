/**
 * Font service for managing user fonts
 */
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import log from 'electron-log';
import type { DetectedFont, IpcResponse } from '../../shared/types';
import { getErrorMessage } from '../../shared/types';
import {
  cleanFontName,
  getFontFormat,
  getFontMimeType,
} from '../utils/fontUtils';

/**
 * Get the user fonts directory path
 */
export const getUserFontsPath = (): string => {
  return path.join(app.getPath('userData'), 'fonts');
};

/**
 * Ensure the fonts directory exists
 */
const ensureFontsDir = (): void => {
  const fontsPath = getUserFontsPath();
  if (!fs.existsSync(fontsPath)) {
    fs.mkdirSync(fontsPath, { recursive: true });
  }
};

/**
 * Load fonts from a directory
 */
const loadFontsFromDirectory = (
  fontsPath: string,
  isUserFont: boolean,
): DetectedFont[] => {
  const fonts: DetectedFont[] = [];

  try {
    if (!fs.existsSync(fontsPath)) {
      fs.mkdirSync(fontsPath, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(fontsPath);

    for (const file of files) {
      const format = getFontFormat(file);

      if (format) {
        const filePath = path.join(fontsPath, file);
        try {
          const fontData = fs.readFileSync(filePath);
          const base64 = fontData.toString('base64');
          const name = cleanFontName(file);
          const mimeType = getFontMimeType(format);

          fonts.push({
            name,
            fileName: file,
            filePath,
            format,
            dataUrl: `data:${mimeType};base64,${base64}`,
            isUserFont,
          });

          log.info(
            `[FontService] Loaded font: ${name} (${file}) - ${isUserFont ? 'user' : 'bundled'}`,
          );
        } catch (error) {
          log.error(`[FontService] Failed to read font file ${file}:`, error);
        }
      }
    }
  } catch (error) {
    log.error(`[FontService] Error scanning fonts folder ${fontsPath}:`, error);
  }

  return fonts;
};

/**
 * Get all user fonts
 */
export const getAllFonts = (): DetectedFont[] => {
  const userFontsPath = getUserFontsPath();
  log.info('[FontService] Scanning user fonts:', userFontsPath);

  const userFonts = loadFontsFromDirectory(userFontsPath, true);
  log.info(`[FontService] Total fonts loaded: ${userFonts.length}`);

  return userFonts;
};

/**
 * Get the lyrics font as a base64 data URL
 */
export const getLyricsFont = (assetPath: string): string | null => {
  log.info('[FontService] Looking for lyrics font at:', assetPath);

  if (fs.existsSync(assetPath)) {
    try {
      const fontData = fs.readFileSync(assetPath);
      const base64 = fontData.toString('base64');
      log.info(
        '[FontService] Font loaded successfully, size:',
        fontData.length,
      );
      return `data:font/truetype;base64,${base64}`;
    } catch (error) {
      log.error('[FontService] Failed to read font file:', error);
      return null;
    }
  }

  log.warn('[FontService] Lyrics font not found at:', assetPath);
  return null;
};

/**
 * Add a font to the user fonts folder
 */
export const addFont = (
  fileName: string,
  base64Data: string,
): IpcResponse<DetectedFont> => {
  try {
    const userFontsPath = getUserFontsPath();
    ensureFontsDir();

    const destPath = path.resolve(userFontsPath, fileName);

    // Path traversal protection
    if (!destPath.startsWith(path.resolve(userFontsPath))) {
      return { success: false, error: 'Invalid file name' };
    }

    // Check if font already exists
    if (fs.existsSync(destPath)) {
      return { success: false, error: 'Font already exists' };
    }

    // Decode base64 and write
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(destPath, buffer);

    // Load the font to return it
    const format = getFontFormat(fileName) || 'truetype';
    const name = cleanFontName(fileName);
    const mimeType = getFontMimeType(format);

    const font: DetectedFont = {
      name,
      fileName,
      filePath: destPath,
      format,
      dataUrl: `data:${mimeType};base64,${base64Data}`,
      isUserFont: true,
    };

    log.info(`[FontService] Added font: ${font.name} (${fileName})`);
    return { success: true, data: font };
  } catch (error) {
    log.error('[FontService] Error adding font:', error);
    return { success: false, error: getErrorMessage(error) };
  }
};

/**
 * Delete a font from the user fonts folder
 */
export const deleteFont = (fileName: string): IpcResponse<void> => {
  try {
    const userFontsPath = getUserFontsPath();
    const fontPath = path.resolve(userFontsPath, fileName);

    // Only allow deleting user fonts
    if (!fontPath.startsWith(path.resolve(userFontsPath))) {
      return { success: false, error: 'Cannot delete bundled fonts' };
    }

    if (!fs.existsSync(fontPath)) {
      return { success: false, error: 'Font not found' };
    }

    fs.unlinkSync(fontPath);
    log.info(`[FontService] Deleted font: ${fileName}`);
    return { success: true };
  } catch (error) {
    log.error('[FontService] Error deleting font:', error);
    return { success: false, error: getErrorMessage(error) };
  }
};

export const fontService = {
  getUserFontsPath,
  getAllFonts,
  getLyricsFont,
  addFont,
  deleteFont,
};
