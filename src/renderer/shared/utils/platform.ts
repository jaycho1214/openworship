/**
 * Returns true if the app is running on macOS.
 */
export const isMac =
  typeof navigator !== 'undefined' && /Mac|Macintosh/.test(navigator.userAgent);

/**
 * Returns the platform-appropriate modifier key label.
 * macOS: ⌘  Windows/Linux: Ctrl
 */
export const modKey = isMac ? '⌘' : 'Ctrl+';

/**
 * Returns the platform-appropriate shift modifier label.
 * macOS: ⇧  Windows/Linux: Shift+
 */
export const shiftKey = isMac ? '⇧' : 'Shift+';
