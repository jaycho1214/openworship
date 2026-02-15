import type { ElectronHandler } from '../../../main/preload';

/**
 * Typed accessor for the electron API exposed via contextBridge.
 * Replaces `(window as any).electron` throughout the renderer.
 */
export function getElectron(): ElectronHandler {
  return (window as unknown as { electron: ElectronHandler }).electron;
}
