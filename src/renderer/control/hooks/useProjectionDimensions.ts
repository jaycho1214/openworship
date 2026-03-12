import { useState, useEffect } from 'react';
import { getElectron } from '../../shared/hooks/useElectron';

const DEFAULT_DIMENSIONS = { width: 1920, height: 1080 };

/**
 * Returns the target projection window dimensions (width x height in CSS pixels).
 * - If the projection window is open, returns its actual content size.
 * - If closed, returns the dimensions of the target display (external or primary).
 * - Automatically updates on display changes, projection open/close, and window resize.
 * - Falls back to 1920x1080 if IPC is unavailable.
 */
export function useProjectionDimensions() {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>(DEFAULT_DIMENSIONS);

  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    // Fetch initial dimensions
    const fetchDimensions = async () => {
      try {
        const result = await electron.displays.getProjectionTarget();
        if (result.success && result.data) {
          setDimensions(result.data);
        }
      } catch {
        // Keep default 1920x1080
      }
    };
    fetchDimensions();

    // Subscribe to live updates from main process
    const unsubscribe = electron.displays.onTargetChanged(
      (dims: { width: number; height: number }) => {
        setDimensions(dims);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return dimensions;
}
