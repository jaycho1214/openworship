/**
 * Electron app launcher for E2E tests.
 *
 * Usage in test files:
 *   let app: ElectronApplication;
 *   let window: Page;
 *
 *   test.beforeAll(async () => {
 *     ({ app, window } = await launchApp());
 *   });
 *   test.afterAll(async () => { await closeApp(app); });
 */
import { type ElectronApplication, type Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

const MAIN_JS = path.resolve(__dirname, '../release/app/dist/main/main.js');

let tempDir: string;

/** Get the temp userData directory path (for seeding test files). */
export function getTempDir(): string {
  return tempDir;
}

export async function launchApp(): Promise<{
  app: ElectronApplication;
  window: Page;
}> {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openworship-e2e-'));

  const app = await electron.launch({
    args: [MAIN_JS],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      OPENWORSHIP_TEST_USER_DATA: tempDir,
    },
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  return { app, window };
}

export async function closeApp(app: ElectronApplication): Promise<void> {
  await app.close();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}
