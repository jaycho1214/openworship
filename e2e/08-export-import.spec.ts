/**
 * E2E tests for Export/Import functionality.
 *
 * Tests the full round-trip: export songs/sessions to .oworship files,
 * then import them back. Uses Electron dialog mocking to bypass native
 * file dialogs and control file paths.
 */
import path from 'path';
import fs from 'fs';
import type { ElectronApplication, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { setupTestData, ensureInSession, dismissOverlays } from './helpers';

test.describe.configure({ mode: 'serial' });

// ── Helpers ─────────────────────────────────────────────────────────────

/** Mock dialog.showSaveDialog to return a specific file path (no native dialog). */
async function mockSaveDialog(app: ElectronApplication, filePath: string) {
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = () =>
      Promise.resolve({ filePath: p, canceled: false });
  }, filePath);
}

/** Mock dialog.showOpenDialog to return a specific file path (no native dialog). */
async function mockOpenDialog(app: ElectronApplication, filePath: string) {
  await app.evaluate(({ dialog }, p) => {
    dialog.showOpenDialog = () =>
      Promise.resolve({ filePaths: [p], canceled: false });
  }, filePath);
}

/** Open settings panel and ensure General tab is active. */
async function openSettingsGeneral(window: Page) {
  const panel = window.getByTestId('settings-panel');
  const panelOpen = await panel
    .evaluate((el) => !el.classList.contains('w-0'))
    .catch(() => false);

  if (!panelOpen) {
    await window.getByTestId('settings-sidebar-collapsed').click();
    await expect(panel).toBeVisible({ timeout: 5_000 });
  }

  // Click General tab
  await panel.getByRole('button', { name: /일반|General/ }).click();
  await window.waitForTimeout(300);
}

/** Close settings panel if open. */
async function closeSettings(window: Page) {
  const panel = window.getByTestId('settings-panel');
  const panelOpen = await panel
    .evaluate((el) => !el.classList.contains('w-0'))
    .catch(() => false);
  if (panelOpen) {
    await window.getByTestId('settings-close-btn').click();
    await window.waitForTimeout(300);
  }
}

// ── Setup ───────────────────────────────────────────────────────────────

test('setup: ensure session and songs exist', async ({ window }) => {
  test.setTimeout(15_000);
  await setupTestData(window);
});

// ═══════════════════════════════════════════════════════════════════════
// Export Session via Context Menu
// ═══════════════════════════════════════════════════════════════════════

test.describe('Export Session', () => {
  test('right-click session and export to .oworship file', async ({
    window,
    electronApp,
    tempDir,
  }) => {
    test.setTimeout(10_000);
    await dismissOverlays(window);

    // Navigate to session list
    const breadcrumb = window.getByTestId('breadcrumb-sessions');
    if (await breadcrumb.isVisible().catch(() => false)) {
      await breadcrumb.click();
      await window.waitForTimeout(500);
    }

    const sessionItem = window.getByTestId('session-item').first();
    await expect(sessionItem).toBeVisible({ timeout: 5_000 });

    // Mock save dialog to write to temp dir
    const exportPath = path.join(tempDir, 'test-session-export.oworship');
    await mockSaveDialog(electronApp, exportPath);

    // Right-click the session and choose "Export Session"
    await sessionItem.click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /내보내기|Export/ })
      .click();

    // Wait for file to be written
    await window.waitForTimeout(1_000);

    // Verify file was created
    const fileExists = fs.existsSync(exportPath);
    expect(fileExists).toBe(true);

    // Verify file content is valid JSON with expected structure
    const content = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    expect(content.version).toBeTruthy();
    expect(content.type).toBe('session');
    expect(content.data).toBeTruthy();
    expect(content.data.sessions).toHaveLength(1);
    expect(content.data.songs).toBeDefined();

    // Re-enter the session
    await sessionItem.click();
    await expect(window.getByTestId('breadcrumb-current')).toBeVisible({
      timeout: 5_000,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Export Library via Settings
// ═══════════════════════════════════════════════════════════════════════

test.describe('Export Library', () => {
  test('export library from settings panel', async ({
    window,
    electronApp,
    tempDir,
  }) => {
    test.setTimeout(10_000);
    await ensureInSession(window);
    await dismissOverlays(window);

    const exportPath = path.join(tempDir, 'test-library-export.oworship');
    await mockSaveDialog(electronApp, exportPath);

    // Open settings → General tab
    await openSettingsGeneral(window);

    // Scroll down and click Export Library button
    const exportBtn = window.getByTestId('export-library-btn');
    await expect(exportBtn).toBeVisible({ timeout: 5_000 });
    await exportBtn.click();

    // Wait for file to be written
    await window.waitForTimeout(1_000);

    // Verify file exists and is valid
    expect(fs.existsSync(exportPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    expect(content.type).toBe('library');
    expect(content.data.songs).toBeDefined();
    expect(content.data.sessions).toBeDefined();
    expect(content.data.songs.length).toBeGreaterThanOrEqual(1);

    await closeSettings(window);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Import via Settings — Full Round-Trip
// ═══════════════════════════════════════════════════════════════════════

test.describe('Import File', () => {
  test('import opens file picker and shows preview dialog', async ({
    window,
    electronApp,
    tempDir,
  }) => {
    test.setTimeout(15_000);
    await ensureInSession(window);
    await dismissOverlays(window);

    // Create a .oworship file with a unique song to import
    const importData = {
      version: '1.1',
      type: 'library',
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0-test',
      data: {
        songs: [
          {
            id: 'e2e-import-song-1',
            title: 'E2E Test Import Song',
            lyrics: 'This is a test song\n\nFor E2E import testing',
            categories: ['Test'],
            tags: ['e2e'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        sessions: [
          {
            id: 'e2e-import-session-1',
            name: 'E2E Imported Session',
            songIds: ['e2e-import-song-1'],
            items: [
              {
                type: 'song',
                position: 0,
                songId: 'e2e-import-song-1',
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    };

    const importPath = path.join(tempDir, 'test-import.oworship');
    fs.writeFileSync(importPath, JSON.stringify(importData, null, 2));

    // Mock the open dialog to return our file
    await mockOpenDialog(electronApp, importPath);

    // Open settings → General → Import
    await openSettingsGeneral(window);
    const importBtn = window.getByTestId('import-file-btn');
    await expect(importBtn).toBeVisible({ timeout: 5_000 });
    await importBtn.click();

    // Import dialog should appear with preview
    const importDialog = window.getByTestId('import-dialog');
    await expect(importDialog).toBeVisible({ timeout: 5_000 });

    // Should show the song title in preview
    await expect(importDialog).toContainText('E2E Test Import Song', {
      timeout: 5_000,
    });

    // Should show the session name in preview
    await expect(importDialog).toContainText('E2E Imported Session', {
      timeout: 5_000,
    });
  });

  test('click Import Now and see success', async ({ window }) => {
    test.setTimeout(10_000);
    const importDialog = window.getByTestId('import-dialog');
    await expect(importDialog).toBeVisible({ timeout: 5_000 });

    // Click "Import Now" button
    const importExecuteBtn = window.getByTestId('import-execute-btn');
    await expect(importExecuteBtn).toBeVisible({ timeout: 5_000 });
    await importExecuteBtn.click();

    // Should show success screen
    await expect(window.getByTestId('import-success')).toBeVisible({
      timeout: 5_000,
    });

    // Close the dialog
    await importDialog
      .getByRole('button', { name: /닫기|Close/ })
      .first()
      .click();
    await expect(importDialog).not.toBeVisible({ timeout: 5_000 });

    await closeSettings(window);
  });

  test('imported session appears in session list', async ({ window }) => {
    test.setTimeout(10_000);
    await dismissOverlays(window);

    // SessionList doesn't auto-refresh after import (always mounted, CSS-toggled).
    // Reload the page to force a fresh load of sessions.
    await window.reload({ waitUntil: 'domcontentloaded' });
    await window.waitForTimeout(1_000);

    // After reload we should be on the sessions list
    await expect(window.getByTestId('session-item').first()).toBeVisible({
      timeout: 5_000,
    });

    // Look for the imported session
    await expect(
      window.getByTestId('session-item-name').filter({
        hasText: 'E2E Imported Session',
      }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('imported session contains the imported song', async ({ window }) => {
    test.setTimeout(10_000);

    // Click the imported session
    await window
      .getByTestId('session-item-name')
      .filter({ hasText: 'E2E Imported Session' })
      .click();
    await expect(window.getByTestId('breadcrumb-current')).toBeVisible({
      timeout: 5_000,
    });

    // Verify the imported song is in the setlist
    await expect(
      window
        .getByTestId('setlist-item')
        .filter({ hasText: 'E2E Test Import Song' }),
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Import with Conflict — Skip Resolution
// ═══════════════════════════════════════════════════════════════════════

test.describe('Import with Conflict', () => {
  test('importing same file again shows conflict indicators', async ({
    window,
    electronApp,
    tempDir,
  }) => {
    test.setTimeout(15_000);
    await ensureInSession(window);
    await dismissOverlays(window);

    // The same file we imported before — now the song and session exist
    const importData = {
      version: '1.1',
      type: 'library',
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0-test',
      data: {
        songs: [
          {
            id: 'e2e-import-song-1',
            title: 'E2E Test Import Song',
            lyrics: 'Updated lyrics for conflict test',
            categories: ['Test'],
            tags: ['e2e'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        sessions: [
          {
            id: 'e2e-import-session-1',
            name: 'E2E Imported Session',
            songIds: ['e2e-import-song-1'],
            items: [{ type: 'song', position: 0, songId: 'e2e-import-song-1' }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    };

    const importPath = path.join(tempDir, 'test-conflict-import.oworship');
    fs.writeFileSync(importPath, JSON.stringify(importData, null, 2));

    await mockOpenDialog(electronApp, importPath);
    await openSettingsGeneral(window);

    const importBtn = window.getByTestId('import-file-btn');
    await importBtn.click();

    const importDialog = window.getByTestId('import-dialog');
    await expect(importDialog).toBeVisible({ timeout: 5_000 });

    // Should show conflict resolution UI (the conflict bar with select trigger)
    const conflictTrigger = window.getByTestId('conflict-resolution-trigger');
    await expect(conflictTrigger).toBeVisible({ timeout: 5_000 });
  });

  test('import with skip resolution skips existing items', async ({
    window,
  }) => {
    test.setTimeout(10_000);
    const importDialog = window.getByTestId('import-dialog');

    // Click Import Now (default is "skip")
    await window.getByTestId('import-execute-btn').click();

    // Should show success screen
    await expect(window.getByTestId('import-success')).toBeVisible({
      timeout: 5_000,
    });

    // Close the dialog
    await importDialog
      .getByRole('button', { name: /닫기|Close/ })
      .first()
      .click();
    await expect(importDialog).not.toBeVisible({ timeout: 5_000 });

    await closeSettings(window);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Export → Import Round-Trip Integrity
// ═══════════════════════════════════════════════════════════════════════

test.describe('Round-Trip Integrity', () => {
  test('export a session, then import into the app and verify content matches', async ({
    window,
    electronApp,
    tempDir,
  }) => {
    test.setTimeout(15_000);
    await dismissOverlays(window);

    // Navigate to session list
    const breadcrumb = window.getByTestId('breadcrumb-sessions');
    if (await breadcrumb.isVisible().catch(() => false)) {
      await breadcrumb.click();
      await window.waitForTimeout(500);
    }

    // Export the first session
    const exportPath = path.join(tempDir, 'roundtrip-export.oworship');
    await mockSaveDialog(electronApp, exportPath);

    const sessionItem = window.getByTestId('session-item').first();
    await expect(sessionItem).toBeVisible({ timeout: 5_000 });
    const sessionName = await sessionItem
      .getByTestId('session-item-name')
      .textContent();

    await sessionItem.click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /내보내기|Export/ })
      .click();
    await window.waitForTimeout(1_000);

    // Verify exported file structure
    expect(fs.existsSync(exportPath)).toBe(true);
    const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    expect(exported.type).toBe('session');
    expect(exported.data.sessions[0].name).toBe(sessionName);

    // Now modify the exported data to have a new unique name (to avoid conflict)
    exported.data.sessions[0].id = 'roundtrip-session-id';
    exported.data.sessions[0].name = 'Roundtrip Verified Session';
    // Give songs new IDs too
    const idMap: Record<string, string> = {};
    for (const song of exported.data.songs) {
      const newId = `roundtrip-${song.id}`;
      idMap[song.id] = newId;
      song.id = newId;
      song.title = `RT: ${song.title}`;
    }
    exported.data.sessions[0].songIds = exported.data.sessions[0].songIds.map(
      (id: string) => idMap[id] || id,
    );
    if (exported.data.sessions[0].items) {
      for (const item of exported.data.sessions[0].items) {
        if (item.songId && idMap[item.songId]) {
          item.songId = idMap[item.songId];
        }
      }
    }

    // Write modified export
    const reimportPath = path.join(tempDir, 'roundtrip-reimport.oworship');
    fs.writeFileSync(reimportPath, JSON.stringify(exported, null, 2));

    // Enter any session so we can access settings
    await sessionItem.click();
    await expect(window.getByTestId('breadcrumb-current')).toBeVisible({
      timeout: 5_000,
    });

    // Import it
    await mockOpenDialog(electronApp, reimportPath);
    await openSettingsGeneral(window);
    await window.getByTestId('import-file-btn').click();

    const importDialog = window.getByTestId('import-dialog');
    await expect(importDialog).toBeVisible({ timeout: 5_000 });
    await expect(importDialog).toContainText('Roundtrip Verified Session', {
      timeout: 5_000,
    });

    await window.getByTestId('import-execute-btn').click();
    await expect(window.getByTestId('import-success')).toBeVisible({
      timeout: 5_000,
    });

    await importDialog
      .getByRole('button', { name: /닫기|Close/ })
      .first()
      .click();
    await closeSettings(window);

    // Reload to force session list refresh (SessionList is always mounted, CSS-toggled)
    await window.reload({ waitUntil: 'domcontentloaded' });
    await window.waitForTimeout(1_000);

    // After reload we should be on the sessions list
    await expect(window.getByTestId('session-item').first()).toBeVisible({
      timeout: 5_000,
    });

    await expect(
      window
        .getByTestId('session-item-name')
        .filter({ hasText: 'Roundtrip Verified Session' }),
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Korean & Space in File Paths
// ═══════════════════════════════════════════════════════════════════════

test.describe('Korean and space in file paths', () => {
  test('export to a path with Korean characters and spaces', async ({
    window,
    electronApp,
    tempDir,
  }) => {
    test.setTimeout(10_000);

    // Reload to get back to session list
    await window.reload({ waitUntil: 'domcontentloaded' });
    await window.waitForTimeout(1_000);

    // Create a directory with Korean + space in the name
    const koreanDir = path.join(tempDir, '예배 파일 export');
    fs.mkdirSync(koreanDir, { recursive: true });
    const exportPath = path.join(koreanDir, '주일 예배 세션.oworship');

    await mockSaveDialog(electronApp, exportPath);

    // Export a session via context menu
    const sessionItem = window.getByTestId('session-item').first();
    await expect(sessionItem).toBeVisible({ timeout: 5_000 });
    await sessionItem.click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /내보내기|Export/ })
      .click();
    await window.waitForTimeout(1_000);

    // Verify file was written at the Korean+space path
    expect(fs.existsSync(exportPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    expect(content.type).toBe('session');
    expect(content.data.sessions).toHaveLength(1);
  });

  test('import from a path with Korean characters and spaces', async ({
    window,
    electronApp,
    tempDir,
  }) => {
    test.setTimeout(15_000);

    // Create a .oworship file inside a Korean+space directory
    const koreanDir = path.join(tempDir, '가져오기 테스트 폴더');
    fs.mkdirSync(koreanDir, { recursive: true });
    const importPath = path.join(koreanDir, '찬양 모음 2026.oworship');

    const importData = {
      version: '1.1',
      type: 'library',
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0-test',
      data: {
        songs: [
          {
            id: 'korean-path-song',
            title: '한국어 경로 테스트 곡',
            lyrics:
              '이것은 한국어 경로 테스트입니다\n\n파일 이름에 한글과 공백',
            categories: ['테스트'],
            tags: ['한국어'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        sessions: [
          {
            id: 'korean-path-session',
            name: '한국어 경로 세션',
            songIds: ['korean-path-song'],
            items: [{ type: 'song', position: 0, songId: 'korean-path-song' }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    };

    fs.writeFileSync(importPath, JSON.stringify(importData, null, 2));

    // Enter a session so we can access settings
    const sessionItem = window.getByTestId('session-item').first();
    await sessionItem.click();
    await expect(window.getByTestId('breadcrumb-current')).toBeVisible({
      timeout: 5_000,
    });
    await dismissOverlays(window);

    // Mock open dialog to return our Korean-path file
    await mockOpenDialog(electronApp, importPath);

    // Open settings → Import
    await openSettingsGeneral(window);
    await window.getByTestId('import-file-btn').click();

    const importDialog = window.getByTestId('import-dialog');
    await expect(importDialog).toBeVisible({ timeout: 5_000 });

    // Preview should show the Korean song and session
    await expect(importDialog).toContainText('한국어 경로 테스트 곡', {
      timeout: 5_000,
    });
    await expect(importDialog).toContainText('한국어 경로 세션', {
      timeout: 5_000,
    });

    // Execute import
    await window.getByTestId('import-execute-btn').click();
    await expect(window.getByTestId('import-success')).toBeVisible({
      timeout: 5_000,
    });

    // Close dialog and settings
    await importDialog
      .getByRole('button', { name: /닫기|Close/ })
      .first()
      .click();
    await expect(importDialog).not.toBeVisible({ timeout: 5_000 });
    await closeSettings(window);

    // Reload and verify the imported session exists
    await window.reload({ waitUntil: 'domcontentloaded' });
    await window.waitForTimeout(1_000);
    await expect(window.getByTestId('session-item').first()).toBeVisible({
      timeout: 5_000,
    });

    await expect(
      window.getByTestId('session-item-name').filter({
        hasText: '한국어 경로 세션',
      }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('export library to deeply nested Korean+space path', async ({
    window,
    electronApp,
    tempDir,
  }) => {
    test.setTimeout(10_000);

    // Enter a session to access settings
    const sessionItem = window.getByTestId('session-item').first();
    await sessionItem.click();
    await expect(window.getByTestId('breadcrumb-current')).toBeVisible({
      timeout: 5_000,
    });
    await dismissOverlays(window);

    // Deeply nested path with mixed Korean/English and spaces
    const deepDir = path.join(
      tempDir,
      '교회 데이터',
      'Open Worship 백업',
      '2026년 3월',
    );
    fs.mkdirSync(deepDir, { recursive: true });
    const exportPath = path.join(deepDir, '전체 라이브러리 백업.oworship');

    await mockSaveDialog(electronApp, exportPath);
    await openSettingsGeneral(window);
    await window.getByTestId('export-library-btn').click();
    await window.waitForTimeout(1_000);

    // Verify file exists and is valid
    expect(fs.existsSync(exportPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    expect(content.type).toBe('library');
    expect(content.data.songs.length).toBeGreaterThanOrEqual(1);
    expect(content.data.sessions.length).toBeGreaterThanOrEqual(1);

    await closeSettings(window);
  });
});
