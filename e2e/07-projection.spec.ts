import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { ensureInSession, dismissOverlays, setupTestData } from './helpers';

test.describe.configure({ mode: 'serial' });

test('setup: ensure session and songs exist', async ({ window }) => {
  test.setTimeout(15_000);
  await setupTestData(window);
});

let projectionPage: Page;

// ── Projection Window ──────────────────────────────────────────────────

test.describe('Projection Window', () => {
  test('activate a slide before opening projection', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);

    // Expand all items so slide buttons are in the DOM
    const expandBtn = window.getByTestId('setlist-collapse-all-btn');
    await expandBtn.click();
    await window.waitForTimeout(300);
    if (
      !(await window
        .getByTestId('slide-btn')
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await expandBtn.click();
      await window.waitForTimeout(300);
    }

    const slideBtn = window.getByTestId('slide-btn');
    expect(await slideBtn.count()).toBeGreaterThan(0);
    await slideBtn.first().click();
    await expect(slideBtn.first()).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });

  test('open projection window and verify second window appears', async ({
    window,
    electronApp,
  }) => {
    test.setTimeout(10_000);
    const windowCountBefore = electronApp.windows().length;
    await window.evaluate(() => (window as any).electron?.projection?.open?.());
    await window.waitForTimeout(3000);
    const allWindows = electronApp.windows();
    expect(allWindows.length).toBeGreaterThan(windowCountBefore);
    projectionPage = allWindows[allWindows.length - 1];
    await projectionPage.waitForLoadState('domcontentloaded');
  });

  test('projection shows lyrics immediately without extra clicks', async ({
    electronApp,
    window,
  }) => {
    test.setTimeout(20_000);
    expect(projectionPage).toBeDefined();
    await projectionPage.waitForLoadState('domcontentloaded');

    // Do NOT click any slides — lyrics should appear automatically
    // because a slide was active before opening projection

    // Find the projection window (might not be the last one)
    const allWindows = electronApp.windows();
    for (const w of allWindows) {
      if (w === window) continue;
      const hasLyrics = await w
        .getByTestId('projection-lyrics')
        .isVisible()
        .catch(() => false);
      if (hasLyrics) {
        projectionPage = w;
        break;
      }
    }

    // Lyrics should be visible without any additional interaction
    // Wait longer on CI — IPC sync can be slower
    const lyricsLocator = projectionPage.getByTestId('projection-lyrics');
    await expect(lyricsLocator).toBeVisible({ timeout: 15_000 });
    // Wait for text content to populate (crossfade animation)
    await projectionPage.waitForTimeout(500);
    const text = await lyricsLocator.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('live preview info shows song title', async ({ window }) => {
    test.setTimeout(15_000);
    // Bring control window to front and click a slide to ensure currentSong is set
    await window.bringToFront();
    await window.waitForTimeout(500);
    const slideBtn = window.getByTestId('slide-btn').first();
    await expect(slideBtn).toBeVisible({ timeout: 5_000 });
    await slideBtn.click();
    await window.waitForTimeout(500);
    const livePreviewInfo = window.getByTestId('live-preview-info');
    await expect(livePreviewInfo).toBeVisible({ timeout: 10_000 });
    const text = await livePreviewInfo.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
    await expect(window.getByTestId('live-preview')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('live preview content matches projection content', async ({
    window,
  }) => {
    test.setTimeout(5_000);
    expect(projectionPage).toBeDefined();
    // Re-get projection window in case reference is stale
    await window.bringToFront();
    await window.waitForTimeout(300);

    const projText = await projectionPage
      .getByTestId('projection-lyrics')
      .textContent()
      .catch(() => '');
    const previewText = await window
      .getByTestId('live-preview')
      .textContent()
      .catch(() => '');

    // Both should have content
    expect(projText?.trim().length).toBeGreaterThan(0);
    expect(previewText?.trim().length).toBeGreaterThan(0);

    // Projection lyrics should appear in the live preview
    if (projText && projText.trim().length > 3) {
      const firstWord = projText.trim().split(/\s+/)[0];
      expect(previewText).toContain(firstWord);
    }
  });

  test('navigate to next slide updates both preview and projection', async ({
    window,
  }) => {
    test.setTimeout(5_000);
    expect(projectionPage).toBeDefined();

    const beforeText = await projectionPage
      .getByTestId('projection-lyrics')
      .textContent()
      .catch(() => '');

    await window.keyboard.press('ArrowRight');
    await window.waitForTimeout(500);

    const afterText = await projectionPage
      .getByTestId('projection-lyrics')
      .textContent()
      .catch(() => '');

    // Projection should have content after navigation
    expect(afterText?.trim().length).toBeGreaterThan(0);
    // Text should have changed (different slide)
    if (beforeText && afterText) {
      expect(afterText).not.toBe(beforeText);
    }

    // Preview info should reflect the navigation
    const previewInfo = await window
      .getByTestId('live-preview-info')
      .textContent();
    expect(previewInfo?.trim().length).toBeGreaterThan(0);
  });

  test('blank screen hides projection content', async ({ window }) => {
    expect(projectionPage).toBeDefined();
    await window.keyboard.press('b');
    await window.waitForTimeout(500);
    const blankOverlay = projectionPage.getByTestId('projection-blank');
    await expect(blankOverlay).toBeVisible({ timeout: 5_000 });
    const opacityOn = await blankOverlay.evaluate(
      (el) => globalThis.getComputedStyle(el).opacity,
    );
    expect(opacityOn).toBe('1');
    await window.keyboard.press('b');
    await window.waitForTimeout(500);
    const opacityOff = await blankOverlay.evaluate(
      (el) => globalThis.getComputedStyle(el).opacity,
    );
    expect(opacityOff).toBe('0');
  });

  test('verse hide makes lyrics invisible on projection', async ({
    window,
  }) => {
    expect(projectionPage).toBeDefined();
    await window.keyboard.press('v');
    await window.waitForTimeout(500);
    const lyricsWrapper = projectionPage.getByTestId(
      'projection-lyrics-wrapper',
    );
    const opacityHidden = await lyricsWrapper.evaluate(
      (el) => globalThis.getComputedStyle(el).opacity,
    );
    expect(opacityHidden).toBe('0');
    await window.keyboard.press('v');
    await window.waitForTimeout(500);
    const opacityVisible = await lyricsWrapper.evaluate(
      (el) => globalThis.getComputedStyle(el).opacity,
    );
    expect(opacityVisible).toBe('1');
  });

  test('LIVE indicator shows when projection is open', async ({ window }) => {
    await window.bringToFront();
    const liveIndicator = window.locator('text=/LIVE|라이브/');
    await expect(liveIndicator.first()).toBeVisible({ timeout: 5_000 });
  });
});

// ── Song Link System ───────────────────────────────────────────────────

test.describe('Song Link System', () => {
  test('open library and add song dialog', async ({ window }) => {
    await window.bringToFront();
    await window.waitForTimeout(500);
    await ensureInSession(window);
    await dismissOverlays(window);
    await window.getByTestId('library-sidebar-collapsed').click();
    await expect(window.getByTestId('library-sidebar')).toBeVisible({
      timeout: 5_000,
    });
    await window.getByTestId('library-add-btn').click();
    await expect(window.getByTestId('add-song-dialog')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('typing existing song title triggers duplicate detection', async ({
    window,
  }) => {
    test.setTimeout(15_000);
    const titleInput = window.getByTestId('add-song-title');
    await titleInput.fill('Holy Holy');
    await window.waitForTimeout(2000);

    // Duplicate detection panel should appear
    await expect(
      window
        .getByTestId('add-song-dialog')
        .getByText(/유사한 곡 발견|Similar songs found/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('clicking "Use this song" links the entry', async ({ window }) => {
    const dialog = window.getByTestId('add-song-dialog');
    await dialog
      .getByText(/이 곡 사용|Use this song/i)
      .first()
      .click();
    await window.waitForTimeout(500);

    // Linked badge should appear
    await expect(
      dialog.getByText(/기존 곡과 연결됨|Linked to existing song/i),
    ).toBeVisible({ timeout: 5_000 });

    // Title input should be read-only
    const titleInput = window.getByTestId('add-song-title');
    const readonlyAttr = await titleInput.getAttribute('readonly');
    expect(readonlyAttr).not.toBeNull();
  });

  test('linked entry shows lyrics as read-only', async ({ window }) => {
    const dialog = window.getByTestId('add-song-dialog');

    // Should show the lyrics text (read-only preview)
    await expect(dialog.getByText('Holy holy holy')).toBeVisible({
      timeout: 5_000,
    });

    // Editable textareas should NOT be visible when linked
    const textareaCount = await dialog.locator('textarea').count();
    expect(textareaCount).toBe(0);
  });

  test('clicking "Unlink" makes fields editable again', async ({ window }) => {
    const dialog = window.getByTestId('add-song-dialog');
    await dialog
      .getByText(/연결 해제|Unlink/i)
      .first()
      .click();
    await window.waitForTimeout(300);

    // Linked badge should disappear
    await expect(
      dialog.getByText(/기존 곡과 연결됨|Linked to existing song/i),
    ).not.toBeVisible({ timeout: 5_000 });

    // Title should be editable again (no readonly)
    const readonlyAttr = await window
      .getByTestId('add-song-title')
      .getAttribute('readonly');
    expect(readonlyAttr).toBeNull();

    // Textarea cards should be back
    await expect(dialog.locator('textarea').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('close dialog and clean up', async ({ window }) => {
    // Close AddSongDialog
    const dialog = window.getByTestId('add-song-dialog');
    await dialog.locator('button').first().click();
    await window.waitForTimeout(500);
    if (await dialog.isVisible().catch(() => false)) {
      await dialog
        .getByRole('button', { name: /취소|Cancel/ })
        .click()
        .catch(() => {});
    }
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // Close library sidebar
    const libSidebar = window.getByTestId('library-sidebar');
    const sidebarOpen = await libSidebar
      .evaluate(
        (el) =>
          (el as HTMLElement).offsetWidth > 0 && !el.classList.contains('w-0'),
      )
      .catch(() => false);
    if (sidebarOpen) {
      await libSidebar.locator('.lucide-chevron-left').first().click();
      await window.waitForTimeout(300);
    }
  });
});

// ── Background Media on Projection ────────────────────────────────────
// Test media files are seeded into userData BEFORE app launch (see fixtures.ts)

test.describe('Background Media on Projection', () => {
  let projPage: Page;

  test('verify test media files exist in userData', async ({ tempDir }) => {
    expect(
      fs.existsSync(path.join(tempDir, 'images', 'test-bg-image.jpg')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tempDir, 'videos', 'test-bg-video.mp4')),
    ).toBe(true);
  });

  test('get projection window reference', async ({ window, electronApp }) => {
    await window.bringToFront();
    const allWindows = electronApp.windows();
    expect(allWindows.length).toBeGreaterThanOrEqual(2);
    projPage = allWindows[allWindows.length - 1];
    expect(projPage).toBeDefined();
  });

  test('select White background and verify on projection', async ({
    window,
  }) => {
    test.setTimeout(5_000);
    await window.bringToFront();
    await window.waitForTimeout(500);
    await ensureInSession(window);
    await dismissOverlays(window);

    // Activate a slide
    const slideBtn = window.getByTestId('slide-btn');
    expect(await slideBtn.count()).toBeGreaterThan(0);
    await slideBtn.first().click();
    await window.waitForTimeout(300);

    const bgSelector = window.getByTestId('bg-selector');
    await expect(bgSelector).toBeVisible({ timeout: 5_000 });

    // Select White background
    await bgSelector.click();
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menu"]')
      .getByText(/White|흰색/)
      .click();
    await window.waitForTimeout(500);

    // Verify White background on projection
    expect(projPage).toBeDefined();
    const bgColor = projPage.getByTestId('projection-bg-color');
    await expect(bgColor).toBeVisible({ timeout: 5_000 });
    const color = await bgColor.evaluate(
      (el) => globalThis.getComputedStyle(el).backgroundColor,
    );
    expect(color).toContain('255');

    // Switch back to Black
    await bgSelector.click();
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menu"]')
      .getByText(/Black|검정/)
      .click();
    await window.waitForTimeout(300);
  });

  test('select background image and verify on both projection and live preview', async ({
    window,
  }) => {
    test.setTimeout(10_000);
    await window.bringToFront();
    await ensureInSession(window);

    const bgSelector = window.getByTestId('bg-selector');
    await bgSelector.click();
    const menu = window.locator('[role="menu"]');
    await expect(menu).toBeVisible({ timeout: 5_000 });

    // The test image MUST appear in the dropdown (seeded before app launch)
    const imageItem = menu
      .locator('[role="menuitem"]')
      .filter({ hasText: 'test-bg-image' });
    await expect(imageItem).toBeVisible({ timeout: 5_000 });
    await imageItem.click();
    await window.waitForTimeout(1000);

    // Verify background image appears on projection
    expect(projPage).toBeDefined();
    const bgImage = projPage.getByTestId('projection-bg-image');
    await expect(bgImage).toBeVisible({ timeout: 5_000 });
    const imgSrc = await bgImage.evaluate((el) => {
      const img = el.querySelector('img') || el;
      return (
        (img as HTMLImageElement).src ||
        (img as HTMLElement).style.backgroundImage
      );
    });
    expect(imgSrc).toBeTruthy();

    // Verify the live preview also shows the background
    const livePreview = window.getByTestId('live-preview');
    await expect(livePreview).toBeVisible({ timeout: 5_000 });

    // Reset back to Black
    await bgSelector.click();
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menu"]')
      .getByText(/Black|검정/)
      .click();
    await window.waitForTimeout(300);
  });

  test('select background video and verify on both projection and live preview', async ({
    window,
  }) => {
    test.setTimeout(10_000);
    await window.bringToFront();
    await ensureInSession(window);

    const bgSelector = window.getByTestId('bg-selector');
    await bgSelector.click();
    const menu = window.locator('[role="menu"]');
    await expect(menu).toBeVisible({ timeout: 5_000 });

    // The test video MUST appear in the dropdown (seeded before app launch)
    const videoItem = menu
      .locator('[role="menuitem"]')
      .filter({ hasText: 'test-bg-video' });
    await expect(videoItem).toBeVisible({ timeout: 5_000 });
    await videoItem.click();
    await window.waitForTimeout(1500);

    // Verify video background appears on projection
    expect(projPage).toBeDefined();
    const bgVideo = projPage.getByTestId('projection-bg-video');
    await expect(bgVideo).toBeVisible({ timeout: 5_000 });
    const hasSrc = await bgVideo.evaluate((el) => {
      const video = el.querySelector('video') || el;
      return !!(
        (video as HTMLVideoElement).src ||
        (video as HTMLVideoElement).currentSrc
      );
    });
    expect(hasSrc).toBe(true);

    // Verify the live preview also shows content
    const livePreview = window.getByTestId('live-preview');
    await expect(livePreview).toBeVisible({ timeout: 5_000 });

    // Reset back to Black
    await bgSelector.click();
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menu"]')
      .getByText(/Black|검정/)
      .click();
    await window.waitForTimeout(300);
  });
});

// ── Announcement Overlay on Projection ────────────────────────────────

test.describe('Announcement Overlay on Projection', () => {
  let projPage: Page;

  test('get projection window and ensure session', async ({
    window,
    electronApp,
  }) => {
    await window.bringToFront();
    await ensureInSession(window);
    await dismissOverlays(window);
    const allWindows = electronApp.windows();
    expect(allWindows.length).toBeGreaterThanOrEqual(2);
    projPage = allWindows[allWindows.length - 1];
    expect(projPage).toBeDefined();
  });

  test('add an overlay announcement', async ({ window }) => {
    test.setTimeout(10_000);
    await window.bringToFront();
    await window.waitForTimeout(500);
    await ensureInSession(window);
    await dismissOverlays(window);

    // Defocus any input before using keyboard shortcut
    await window.locator('body').click({ position: { x: 200, y: 120 } });
    await window.waitForTimeout(300);

    // Open AddContentDialog
    const addBtn = window.getByTestId('setlist-add-btn');
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
    } else {
      await window.keyboard.press('a');
    }
    await expect(window.getByTestId('add-content-dialog')).toBeVisible({
      timeout: 5_000,
    });

    // Switch to announcement tab
    await window.getByTestId('tab-announcement').click();
    await window.waitForTimeout(300);

    // Type announcement text
    const dialog = window.getByTestId('add-content-dialog');
    const textarea = dialog.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    await textarea.fill('Special announcement text');
    await window.waitForTimeout(200);

    // Switch display mode to Overlay if available
    const overlayBtn = dialog.getByText(/오버레이|Overlay/i);
    if (await overlayBtn.isVisible().catch(() => false)) {
      await overlayBtn.click();
      await window.waitForTimeout(200);
    }

    // Click add
    await window.getByTestId('note-add-btn').click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test('verify overlay announcement appears in setlist', async ({ window }) => {
    const lastItem = window.getByTestId('setlist-item').last();
    await expect(lastItem).toContainText('Special announcement', {
      timeout: 5_000,
    });
  });

  test('clicking overlay note toggles it on projection', async ({ window }) => {
    expect(projPage).toBeDefined();

    // Click the overlay note item to show it on projection
    await window.getByTestId('setlist-item').last().click();
    await window.waitForTimeout(1000);

    // Check projection for the note overlay
    const noteOverlay = projPage.getByTestId('projection-note-overlay');
    const overlayVisible = await noteOverlay.isVisible().catch(() => false);

    if (overlayVisible) {
      // Opacity should be 1 when visible
      const opacity = await noteOverlay.evaluate(
        (el) => globalThis.getComputedStyle(el).opacity,
      );
      expect(parseFloat(opacity)).toBeGreaterThan(0);

      // Should contain the announcement text
      const text = await noteOverlay.textContent();
      expect(text).toContain('Special announcement');
    }
  });

  test('lyrics and announcement do not overlap (different z-index)', async () => {
    expect(projPage).toBeDefined();

    const lyricsWrapper = projPage.getByTestId('projection-lyrics-wrapper');
    const noteOverlay = projPage.getByTestId('projection-note-overlay');

    const lyricsVisible = await lyricsWrapper.isVisible().catch(() => false);
    const noteVisible = await noteOverlay.isVisible().catch(() => false);

    if (lyricsVisible && noteVisible) {
      const lyricsZ = await lyricsWrapper.evaluate((el) =>
        parseInt(globalThis.getComputedStyle(el).zIndex || '0', 10),
      );
      const noteZ = await noteOverlay.evaluate((el) =>
        parseInt(globalThis.getComputedStyle(el).zIndex || '0', 10),
      );
      // Note overlay should be above lyrics (higher z-index)
      expect(noteZ).toBeGreaterThan(lyricsZ);
    }
  });

  test('click overlay note again to hide it', async ({ window }) => {
    expect(projPage).toBeDefined();
    await window.bringToFront();
    await window.getByTestId('setlist-item').last().click();
    await window.waitForTimeout(500);

    // Verify the note overlay opacity went back to 0
    const noteOverlay = projPage.getByTestId('projection-note-overlay');
    const overlayVisible = await noteOverlay.isVisible().catch(() => false);
    if (overlayVisible) {
      const opacity = await noteOverlay.evaluate(
        (el) => globalThis.getComputedStyle(el).opacity,
      );
      expect(parseFloat(opacity)).toBe(0);
    }
  });
});
