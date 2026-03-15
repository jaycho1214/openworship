/**
 * Shared Playwright fixtures for OpenWorship E2E tests.
 *
 * The Electron app launches ONCE per worker (and workers: 1 means once total).
 * All test files share the same app instance, window, and database.
 *
 * Usage in test files:
 *   import { test, expect } from './fixtures';
 *
 *   test('my test', async ({ window, electronApp }) => {
 *     await window.getByTestId('...').click();
 *   });
 */
import {
  test as base,
  expect,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

const MAIN_JS = path.resolve(__dirname, '../release/app/dist/main/main.js');

// ── Types ──────────────────────────────────────────────────────────────
type WorkerFixtures = {
  electronApp: ElectronApplication;
  window: Page;
  tempDir: string;
};

// ── Fixture ────────────────────────────────────────────────────────────
export const test = base.extend<object, WorkerFixtures>({
  tempDir: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openworship-e2e-'));
      await use(dir);
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
    },
    { scope: 'worker' },
  ],

  electronApp: [
    async ({ tempDir }, use) => {
      // Seed test media files BEFORE app launch so the app finds them on startup
      const fixturesDir = path.resolve(__dirname, 'fixtures');
      const imagesDir = path.join(tempDir, 'images');
      const videosDir = path.join(tempDir, 'videos');
      fs.mkdirSync(imagesDir, { recursive: true });
      fs.mkdirSync(videosDir, { recursive: true });
      const imgSrc = path.join(fixturesDir, 'test-bg-image.jpg');
      const vidSrc = path.join(fixturesDir, 'test-bg-video.mp4');
      if (fs.existsSync(imgSrc)) {
        fs.copyFileSync(imgSrc, path.join(imagesDir, 'test-bg-image.jpg'));
      }
      if (fs.existsSync(vidSrc)) {
        fs.copyFileSync(vidSrc, path.join(videosDir, 'test-bg-video.mp4'));
      }

      const app = await electron.launch({
        args: [MAIN_JS],
        env: {
          ...process.env,
          NODE_ENV: 'production',
          OPENWORSHIP_TEST_USER_DATA: tempDir,
        },
      });

      await use(app);
      await app.close();
    },
    { scope: 'worker' },
  ],

  window: [
    async ({ electronApp }, use) => {
      const win = await electronApp.firstWindow();
      await win.waitForLoadState('domcontentloaded');
      await use(win);
    },
    { scope: 'worker' },
  ],
});

export { expect };
