import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 3_000, // 3s default — slow tests override with test.setTimeout()
  retries: 0,
  workers: 1, // Electron tests must run serially
  fullyParallel: false,
  reporter: [['html', { open: 'never' }], ['list']],
  outputDir: 'e2e-results',
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
