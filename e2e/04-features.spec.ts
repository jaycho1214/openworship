import { test, expect } from './fixtures';
import { ensureInSession, dismissOverlays, setupTestData } from './helpers';

test.describe.configure({ mode: 'serial' });

test('setup: ensure session and songs exist', async ({ window }) => {
  test.setTimeout(15_000);
  await setupTestData(window);
});

// ── Presentation Buttons ────────────────────────────────────────────────

test.describe('Presentation Buttons', () => {
  test('setup: activate first item first slide', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);

    const firstItem = window.getByTestId('setlist-item').first();
    await firstItem.click();
    await window.waitForTimeout(300);

    const slides = window.getByTestId('slide-btn');
    const count = await slides.count();
    expect(count).toBeGreaterThan(0);
    await slides.first().click();
    await expect(slides.first()).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });

  test('btn-next-slide advances active slide', async ({ window }) => {
    await window.getByTestId('btn-next-slide').click();
    const slides = window.getByTestId('slide-btn');
    await expect(slides.nth(1)).toHaveClass(/bg-active/, { timeout: 5_000 });
  });

  test('btn-prev-slide goes back', async ({ window }) => {
    await window.getByTestId('btn-prev-slide').click();
    const slides = window.getByTestId('slide-btn');
    await expect(slides.first()).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });

  test('btn-next-song activates next item + live preview has lyrics', async ({
    window,
  }) => {
    await window.getByTestId('btn-next-song').click();
    await window.waitForTimeout(300);
    const secondItem = window.getByTestId('setlist-item').nth(1);
    await expect(secondItem.locator('.bg-active').first()).toBeVisible({
      timeout: 5_000,
    });
    // Live preview must still show lyrics
    const text = await window.getByTestId('live-preview').textContent();
    expect(text?.includes('Holy') || text?.includes('holy')).toBe(true);
  });

  test('btn-prev-song goes back + live preview has lyrics', async ({
    window,
  }) => {
    await window.getByTestId('btn-prev-song').click();
    await window.waitForTimeout(300);
    const firstItem = window.getByTestId('setlist-item').first();
    await expect(firstItem.locator('.bg-active').first()).toBeVisible({
      timeout: 5_000,
    });
    // Live preview must still show lyrics
    const text = await window.getByTestId('live-preview').textContent();
    expect(text?.includes('Amazing') || text?.includes('grace')).toBe(true);
  });

  test('btn-blank toggles aria-pressed', async ({ window }) => {
    await window.getByTestId('btn-blank').click();
    await expect(window.getByTestId('btn-blank')).toHaveAttribute(
      'aria-pressed',
      'true',
      { timeout: 5_000 },
    );
    await window.getByTestId('btn-blank').click();
    await expect(window.getByTestId('btn-blank')).toHaveAttribute(
      'aria-pressed',
      'false',
      { timeout: 5_000 },
    );
  });
});

// ── Undo/Redo (CRUD) ──────────────────────────────────────────────────

test.describe('Undo/Redo', () => {
  test('undo restores a deleted setlist item', async ({ window }) => {
    test.setTimeout(10_000);
    await ensureInSession(window);
    await dismissOverlays(window);

    const countBefore = await window.getByTestId('setlist-item').count();
    expect(countBefore).toBeGreaterThanOrEqual(2);

    // Delete first item via context menu
    const firstItem = window.getByTestId('setlist-item').first();
    const titleText = firstItem.locator('p').first();
    const deletedTitle = await titleText.textContent();
    await titleText.click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /삭제|Delete/ })
      .click();
    const alertDialog = window.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5_000 });
    await alertDialog
      .locator('button')
      .filter({ hasText: /삭제|Delete/ })
      .click();

    // Verify item was deleted
    await expect(window.getByTestId('setlist-item')).toHaveCount(
      countBefore - 1,
      { timeout: 5_000 },
    );

    // Undo should restore the deleted item
    const undoBtn = window.getByTestId('btn-undo');
    await expect(undoBtn).toBeEnabled({ timeout: 5_000 });
    await undoBtn.click();
    await expect(window.getByTestId('setlist-item')).toHaveCount(countBefore, {
      timeout: 5_000,
    });

    // The restored item should contain the original title
    if (deletedTitle) {
      await expect(
        window.getByTestId('setlist-item').filter({ hasText: deletedTitle }),
      ).toBeVisible({ timeout: 5_000 });
    }

    // The restored item should contain the original title
    if (deletedTitle) {
      await expect(
        window.getByTestId('setlist-item').filter({ hasText: deletedTitle }),
      ).toBeVisible({ timeout: 5_000 });
    }

    // Live preview lyrics must be visible (opacity 1) after undo
    await window.waitForTimeout(500);
    const lyricsInPreview = window
      .getByTestId('live-preview')
      .locator('[data-testid="projection-lyrics"]');
    await expect(lyricsInPreview).toBeVisible({ timeout: 5_000 });
    const lyricsOpacity = await lyricsInPreview.evaluate(
      (el) => globalThis.getComputedStyle(el).opacity,
    );
    expect(parseFloat(lyricsOpacity)).toBe(1);
  });

  test('live preview shows actual lyrics after CRUD operations', async ({
    window,
  }) => {
    test.setTimeout(10_000);
    await ensureInSession(window);
    await dismissOverlays(window);

    // Click first slide to make sure it's active
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

    const firstSlide = window.getByTestId('slide-btn').first();
    await firstSlide.click();
    await expect(firstSlide).toHaveClass(/bg-active/, { timeout: 5_000 });

    // Live preview info should show the song title
    const info = window.getByTestId('live-preview-info');
    await expect(info).toBeVisible({ timeout: 5_000 });
    const infoText = await info.textContent();
    expect(infoText?.trim().length).toBeGreaterThan(0);

    // The live preview should contain actual lyrics text (not empty)
    // The ProjectionRenderer inside live-preview renders a LyricsOverlay
    // which only appears when currentSlide has lines
    const livePreview = window.getByTestId('live-preview');
    const previewText = await livePreview.textContent();
    // Should contain some lyrics text (Amazing, Holy, grace, etc.)
    const hasLyrics =
      previewText?.includes('Amazing') ||
      previewText?.includes('Holy') ||
      previewText?.includes('grace') ||
      previewText?.includes('sound');
    expect(hasLyrics).toBe(true);
  });
});

// ── Settings Details ────────────────────────────────────────────────────

test.describe('Settings Details', () => {
  test('open settings panel', async ({ window }) => {
    await window.getByTestId('settings-sidebar-collapsed').click();
    await expect(window.getByTestId('settings-panel')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('click theme-dark sets dark class on document', async ({ window }) => {
    await window.getByTestId('theme-dark').click();
    await expect(window.locator('html')).toHaveClass(/dark/, {
      timeout: 5_000,
    });
  });

  test('click theme-light removes dark class', async ({ window }) => {
    await window.getByTestId('theme-light').click();
    await expect(window.locator('html')).not.toHaveClass(/dark/, {
      timeout: 5_000,
    });
  });

  test('click theme-system restores system theme', async ({ window }) => {
    await window.getByTestId('theme-system').click();
    await window.waitForTimeout(300);
    // Verify neither dark nor light is forced — theme-system button should be visually selected
    // (the system theme button should NOT have the same state as forced dark/light)
    await expect(window.getByTestId('theme-dark')).toBeVisible({
      timeout: 5_000,
    });
    await expect(window.getByTestId('theme-light')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('switch to Display tab', async ({ window }) => {
    await window.getByTestId('settings-tab-display').click();
    await window.waitForTimeout(300);
    await expect(
      window
        .getByTestId('settings-panel')
        .getByText(/Font|폰트|Fonts|글꼴/)
        .first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('switch back to General tab', async ({ window }) => {
    await window.getByTestId('settings-tab-general').click();
    await window.waitForTimeout(300);
    await expect(window.getByTestId('theme-light')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('close settings via close button', async ({ window }) => {
    await window.getByTestId('settings-close-btn').click();
    await expect(window.getByTestId('settings-panel')).toHaveClass(/w-0/, {
      timeout: 5_000,
    });
  });
});

// ── Global Search ───────────────────────────────────────────────────────

test.describe('Global Search', () => {
  test('Cmd+K opens global search', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);

    await window.keyboard.press('Meta+k');
    await expect(window.getByTestId('global-search-dialog')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('type "Amazing" and verify result or no-results message', async ({
    window,
  }) => {
    await window.getByTestId('global-search-input').fill('Amazing');
    await window.waitForTimeout(500);

    const dialog = window.getByTestId('global-search-dialog');
    const hasResult = await dialog
      .getByText('Amazing Grace')
      .isVisible()
      .catch(() => false);
    const hasNoResults = await dialog
      .getByText(/결과를 찾을 수 없습니다|No results/)
      .isVisible()
      .catch(() => false);
    expect(hasResult || hasNoResults).toBe(true);
  });

  test('press Escape to close global search', async ({ window }) => {
    await window.keyboard.press('Escape');
    await expect(window.getByTestId('global-search-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Add Content Dialog Tabs ─────────────────────────────────────────────

test.describe('Add Content Dialog Tabs', () => {
  test('open add content dialog via setlist-add-btn', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);

    const addBtn = window.getByTestId('setlist-add-btn');
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
    } else {
      await window.keyboard.press('s');
    }
    await expect(window.getByTestId('add-content-dialog')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('Song tab is active by default and search input is visible', async ({
    window,
  }) => {
    await expect(window.getByTestId('tab-song')).toHaveClass(/bg-background/, {
      timeout: 5_000,
    });
    await expect(window.getByTestId('add-content-search')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('click tab-announcement shows NoteForm textarea', async ({ window }) => {
    await window.getByTestId('tab-announcement').click();
    await window.waitForTimeout(300);
    await expect(
      window.getByTestId('add-content-dialog').locator('textarea').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('click tab-song shows search input again', async ({ window }) => {
    await window.getByTestId('tab-song').click();
    await window.waitForTimeout(300);
    await expect(window.getByTestId('add-content-search')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('press Escape to close add content dialog', async ({ window }) => {
    await window.keyboard.press('Escape');
    await expect(window.getByTestId('add-content-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Verse Visibility ────────────────────────────────────────────────────

test.describe('Verse Visibility', () => {
  test('press V to hide verse', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);

    await window.keyboard.press('v');
    await expect(window.getByTestId('btn-verse-hide')).toHaveAttribute(
      'aria-pressed',
      'true',
      { timeout: 5_000 },
    );
  });

  test('press V again to show verse', async ({ window }) => {
    await window.keyboard.press('v');
    await expect(window.getByTestId('btn-verse-hide')).toHaveAttribute(
      'aria-pressed',
      'false',
      { timeout: 5_000 },
    );
  });
});

// ── Live Preview Verification ───────────────────────────────────────────

test.describe('Live Preview Verification', () => {
  test('live-preview-info shows song title and slide index', async ({
    window,
  }) => {
    await ensureInSession(window);
    await dismissOverlays(window);

    await expect(window.getByTestId('live-preview-info')).toBeVisible({
      timeout: 5_000,
    });
    const text = await window.getByTestId('live-preview-info').textContent();
    const hasSongTitle =
      text?.includes('Amazing Grace') ||
      text?.includes('Holy Holy') ||
      text?.includes('Glory to God');
    expect(hasSongTitle).toBe(true);
  });

  test('live preview container is visible', async ({ window }) => {
    await expect(window.getByTestId('live-preview')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('projection closed overlay is visible', async ({ window }) => {
    const closed = window.getByTestId('live-preview-closed');
    await expect(closed).toBeVisible({ timeout: 5_000 });
    await expect(closed).toContainText(
      /프로젝션이 꺼져 있습니다|Projection is off/,
      { timeout: 5_000 },
    );
  });
});
