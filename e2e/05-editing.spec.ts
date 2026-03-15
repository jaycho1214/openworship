import { test, expect } from './fixtures';
import { ensureInSession, dismissOverlays, setupTestData } from './helpers';

test.describe.configure({ mode: 'serial' });

test('setup: ensure session and songs exist', async ({ window }) => {
  test.setTimeout(15_000);
  await setupTestData(window);
});

// ── Slide Duplication & Deletion ───────────────────────────────────────

test.describe('Slide Duplication & Deletion', () => {
  test('expand all items', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);
    await window.getByTestId('setlist-collapse-all-btn').click();
    await window.waitForTimeout(500);
    const firstSlide = window.getByTestId('slide-btn').first();
    if (!(await firstSlide.isVisible().catch(() => false))) {
      await window.getByTestId('setlist-collapse-all-btn').click();
      await window.waitForTimeout(500);
    }
    await expect(firstSlide).toBeVisible({ timeout: 5_000 });
  });

  test('count initial slides in first item (should be 2)', async ({
    window,
  }) => {
    await window.getByTestId('setlist-item').first().click();
    await window.waitForTimeout(300);
    const trigger = window
      .getByTestId('setlist-item')
      .first()
      .locator('button[data-state]')
      .first();
    const state = await trigger.getAttribute('data-state');
    if (state === 'closed') {
      await trigger.click();
      await window.waitForTimeout(300);
    }
    await expect(
      window.getByTestId('setlist-item').first().getByTestId('slide-btn'),
    ).toHaveCount(2, { timeout: 5_000 });
  });

  test('right-click first slide and duplicate', async ({ window }) => {
    await window
      .getByTestId('setlist-item')
      .first()
      .getByTestId('slide-btn')
      .first()
      .click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /슬라이드 복제|Duplicate Slide/ })
      .click();
    await window.waitForTimeout(500);
    await expect(
      window.getByTestId('setlist-item').first().getByTestId('slide-btn'),
    ).toHaveCount(3, { timeout: 5_000 });
  });

  test('right-click duplicated slide and delete', async ({ window }) => {
    await window
      .getByTestId('setlist-item')
      .first()
      .getByTestId('slide-btn')
      .nth(1)
      .click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /슬라이드 삭제|Delete Slide/ })
      .click();
    await window.waitForTimeout(500);
    await expect(
      window.getByTestId('setlist-item').first().getByTestId('slide-btn'),
    ).toHaveCount(2, { timeout: 5_000 });
  });

  test('delete active slide and verify live preview still shows lyrics', async ({
    window,
  }) => {
    test.setTimeout(10_000);
    const firstItem = window.getByTestId('setlist-item').first();
    const slides = firstItem.getByTestId('slide-btn');

    // Click the first slide to make it active
    await slides.first().click();
    await expect(slides.first()).toHaveClass(/bg-active/, { timeout: 5_000 });

    // Verify live preview shows lyrics BEFORE deletion
    const livePreview = window.getByTestId('live-preview');
    const textBefore = await livePreview.textContent();
    const hasLyricsBefore =
      textBefore?.includes('Amazing') ||
      textBefore?.includes('grace') ||
      textBefore?.includes('Holy') ||
      textBefore?.includes('sound');
    expect(hasLyricsBefore).toBe(true);

    // Duplicate the active slide first (so we have 3, can safely delete 1)
    await slides.first().click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /슬라이드 복제|Duplicate Slide/ })
      .click();
    await window.waitForTimeout(500);
    await expect(slides).toHaveCount(3, { timeout: 5_000 });

    // Now delete the active (first) slide
    await slides.first().click();
    await expect(slides.first()).toHaveClass(/bg-active/, { timeout: 5_000 });
    await slides.first().click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /슬라이드 삭제|Delete Slide/ })
      .click();
    await window.waitForTimeout(500);
    await expect(slides).toHaveCount(2, { timeout: 5_000 });

    // Live preview lyrics must be visible (opacity 1) after slide deletion
    await window.waitForTimeout(300);
    const lyricsInPreview = livePreview.locator(
      '[data-testid="projection-lyrics"]',
    );
    await expect(lyricsInPreview).toBeVisible({ timeout: 5_000 });
    const opacity = await lyricsInPreview.evaluate(
      (el) => globalThis.getComputedStyle(el).opacity,
    );
    expect(parseFloat(opacity)).toBe(1);
  });
});

// ── Add Text Announcement ──────────────────────────────────────────────

test.describe('Add Text Announcement', () => {
  test('add announcement and verify it appears', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);

    const countBefore = await window.getByTestId('setlist-item').count();

    const addBtn = window.getByTestId('setlist-add-btn');
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
    } else {
      await window.keyboard.press('s');
    }
    await expect(window.getByTestId('add-content-dialog')).toBeVisible({
      timeout: 5_000,
    });
    await window.getByTestId('tab-announcement').click();
    await window.waitForTimeout(300);
    await window
      .getByTestId('add-content-dialog')
      .locator('textarea')
      .fill('Welcome everyone');
    await window.waitForTimeout(200);
    await window.getByTestId('note-add-btn').click();
    await expect(window.getByTestId('add-content-dialog')).not.toBeVisible({
      timeout: 5_000,
    });

    // Verify count increased by 1
    await expect(window.getByTestId('setlist-item')).toHaveCount(
      countBefore + 1,
      { timeout: 5_000 },
    );

    // Verify announcement text is visible in the last item
    await expect(window.getByTestId('setlist-item').last()).toContainText(
      'Welcome everyone',
      { timeout: 5_000 },
    );
  });
});

// ── Delete Setlist Item ────────────────────────────────────────────────

test.describe('Delete Setlist Item', () => {
  test('delete active song and verify live preview shows next song lyrics', async ({
    window,
  }) => {
    test.setTimeout(10_000);
    await ensureInSession(window);
    await dismissOverlays(window);

    const initialCount = await window.getByTestId('setlist-item').count();
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // Expand and click first item's slide to make it the active song
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
    const firstSlide = window
      .getByTestId('setlist-item')
      .first()
      .getByTestId('slide-btn')
      .first();
    await firstSlide.click();
    await expect(firstSlide).toHaveClass(/bg-active/, { timeout: 5_000 });

    // Verify live preview has lyrics before deletion
    const livePreview = window.getByTestId('live-preview');
    const textBefore = await livePreview.textContent();
    expect(textBefore?.trim().length).toBeGreaterThan(10);

    // Delete the ACTIVE (first) song via context menu
    await window
      .getByTestId('setlist-item')
      .first()
      .locator('p')
      .first()
      .click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /삭제|Delete/ })
      .click();
    await window.waitForTimeout(300);
    await window
      .locator('[role="alertdialog"]')
      .getByRole('button', { name: /삭제|Delete/ })
      .click();
    await expect(window.getByTestId('setlist-item')).toHaveCount(
      initialCount - 1,
      { timeout: 5_000 },
    );

    // Live preview lyrics must be visible (opacity 1) after song deletion
    await window.waitForTimeout(500);
    const lyricsAfterDelete = window
      .getByTestId('live-preview')
      .locator('[data-testid="projection-lyrics"]');
    await expect(lyricsAfterDelete).toBeVisible({ timeout: 5_000 });
    const opacityAfterDelete = await lyricsAfterDelete.evaluate(
      (el) => globalThis.getComputedStyle(el).opacity,
    );
    expect(parseFloat(opacityAfterDelete)).toBe(1);

    // Info header should show the next song's title
    const info = window.getByTestId('live-preview-info');
    await expect(info).toBeVisible({ timeout: 5_000 });
  });
});

// ── Song Editor ────────────────────────────────────────────────────────

test.describe('Song Editor', () => {
  test('right-click first setlist item and open song editor', async ({
    window,
  }) => {
    await ensureInSession(window);
    await dismissOverlays(window);
    await window
      .getByTestId('setlist-item')
      .first()
      .locator('p')
      .first()
      .click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /곡 편집|Edit Song/ })
      .click();
    await window.waitForTimeout(300);
    await expect(window.getByTestId('song-editor-dialog')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('song editor title has current title', async ({ window }) => {
    await expect(window.getByTestId('song-editor-title')).toBeVisible({
      timeout: 5_000,
    });
    const inputValue = await window
      .getByTestId('song-editor-title')
      .inputValue();
    expect(inputValue).toBeTruthy();
  });

  test('change title and save', async ({ window }) => {
    await window
      .getByTestId('song-editor-title')
      .fill('Amazing Grace (Edited)');
    await window.waitForTimeout(200);
    await window.getByTestId('song-editor-save').click();
    await expect(window.getByTestId('song-editor-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('setlist item shows updated title', async ({ window }) => {
    await expect(window.getByTestId('setlist-item').first()).toContainText(
      'Amazing Grace (Edited)',
      { timeout: 5_000 },
    );
  });
});
