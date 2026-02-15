/**
 * Image service for managing user background images
 */
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import log from 'electron-log';
import type { IpcResponse } from '../../shared/types';
import { getErrorMessage } from '../../shared/types';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/**
 * Get the user images directory path
 */
export const getUserImagesPath = (): string => {
  return path.join(app.getPath('userData'), 'images');
};

/**
 * Ensure the images directory exists
 */
const ensureImagesDir = (): void => {
  const imagesPath = getUserImagesPath();
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }
};

/**
 * Get all images from the user images folder
 */
export const getAllImages = (): string[] => {
  const userImagesPath = getUserImagesPath();
  log.info('[ImageService] Scanning user images:', userImagesPath);

  try {
    ensureImagesDir();

    const files = fs.readdirSync(userImagesPath);
    const imageFiles = files
      .filter((file) =>
        IMAGE_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext)),
      )
      .map((file) => path.join(userImagesPath, file));

    log.info('[ImageService] Found images:', imageFiles.length);
    return imageFiles;
  } catch (error) {
    log.error('[ImageService] Error reading images folder:', error);
    return [];
  }
};

/**
 * Add an image to the user images folder
 */
export const addImage = (
  fileName: string,
  base64Data: string,
): IpcResponse<string> => {
  try {
    const userImagesPath = getUserImagesPath();
    ensureImagesDir();

    // Generate unique filename if already exists
    // Path traversal protection
    const resolvedBase = path.resolve(userImagesPath, fileName);
    if (!resolvedBase.startsWith(path.resolve(userImagesPath))) {
      return { success: false, error: 'Invalid file name' };
    }

    let finalFileName = fileName;
    let filePath = path.join(userImagesPath, finalFileName);
    let counter = 1;

    while (fs.existsSync(filePath)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      finalFileName = `${base}_${counter}${ext}`;
      filePath = path.join(userImagesPath, finalFileName);
      counter++;
    }

    // Write the image file
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    log.info('[ImageService] Added image:', filePath);
    return { success: true, data: filePath };
  } catch (error) {
    log.error('[ImageService] Error adding image:', error);
    return { success: false, error: getErrorMessage(error) };
  }
};

/**
 * Delete an image from the user images folder
 */
export const deleteImage = (filePath: string): IpcResponse<void> => {
  try {
    const userImagesPath = getUserImagesPath();

    // Security check: only allow deleting from user images folder
    if (!path.resolve(filePath).startsWith(path.resolve(userImagesPath))) {
      log.warn(
        '[ImageService] Attempted to delete image outside user folder:',
        filePath,
      );
      return {
        success: false,
        error: 'Cannot delete images outside user folder',
      };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Image not found' };
    }

    fs.unlinkSync(filePath);
    log.info('[ImageService] Deleted image:', filePath);
    return { success: true };
  } catch (error) {
    log.error('[ImageService] Error deleting image:', error);
    return { success: false, error: getErrorMessage(error) };
  }
};

export const imageService = {
  getUserImagesPath,
  getAllImages,
  addImage,
  deleteImage,
};
