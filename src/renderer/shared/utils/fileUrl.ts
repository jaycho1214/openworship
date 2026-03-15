/**
 * Convert a filesystem path to a properly formatted file:// URL.
 * Handles Windows drive-letter paths (C:\...) by adding a third slash.
 */
export function toFileUrl(filePath: string): string {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  // Windows drive letter needs triple-slash: file:///C:/...
  if (/^[A-Za-z]:/.test(normalized)) {
    return `file:///${normalized}`;
  }
  // Unix paths already start with /, so file:// + /path = file:///path
  return `file://${normalized}`;
}

/**
 * Convert a filesystem path to an app:// media URL.
 * Works cross-platform by splitting on both / and \, encoding each segment.
 * Preserves Windows drive letters (e.g., C:) without encoding the colon.
 */
export function toAppMediaUrl(filePath: string): string {
  if (filePath.startsWith('app://') || filePath.startsWith('file://')) {
    return filePath;
  }
  const parts = filePath.split(/[/\\]/);
  const encodedParts = parts.map((part, i) => {
    // Preserve Windows drive letter (e.g., "C:") without encoding the colon
    if (i === 0 && /^[A-Za-z]:$/.test(part)) {
      return part;
    }
    return encodeURIComponent(part);
  });
  const encodedPath = encodedParts.join('/');
  return `app://media${encodedPath.startsWith('/') ? '' : '/'}${encodedPath}`;
}
