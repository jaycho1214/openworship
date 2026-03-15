import { test, expect } from './fixtures';
import { ensureInSession, setupTestData } from './helpers';

test.describe.configure({ mode: 'serial' });

test('setup: ensure session and songs exist', async ({ window }) => {
  test.setTimeout(15_000);
  await setupTestData(window);
});

// ── Slide Navigation ────────────────────────────────────────────────────

test.describe('Slide Navigation', () => {
  test('ensure first setlist item is active and expanded', async ({
    window,
  }) => {
    const firstItem = window.getByTestId('setlist-item').first();
    await firstItem.click();
    await window.waitForTimeout(300);

    const trigger = firstItem.locator('button[data-state]').first();
    const state = await trigger.getAttribute('data-state').catch(() => null);
    if (state === 'closed') {
      await trigger.click();
      await window.waitForTimeout(300);
    }

    // Verify slides are visible (item is expanded)
    await expect(firstItem.getByTestId('slide-btn').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('click first slide button and verify it gets bg-active class', async ({
    window,
  }) => {
    const slides = window.getByTestId('slide-btn');
    const count = await slides.count();
    expect(count).toBeGreaterThan(0);

    await slides.first().click();
    await expect(slides.first()).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });

  test('click second slide button and verify active class moves', async ({
    window,
  }) => {
    const slides = window.getByTestId('slide-btn');
    const count = await slides.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await slides.nth(1).click();
    await expect(slides.nth(1)).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
    await expect(slides.first()).not.toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });

  test('verify slide text content matches entered lyrics', async ({
    window,
  }) => {
    const slides = window.getByTestId('slide-btn');
    await expect(slides.first()).toContainText('Amazing grace how sweet', {
      timeout: 5_000,
    });
  });

  test('verify slide count in setlist header', async ({ window }) => {
    const firstItem = window.getByTestId('setlist-item').first();
    await expect(firstItem.locator('text=2').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('ArrowRight advances active slide', async ({ window }) => {
    const slides = window.getByTestId('slide-btn');
    await slides.first().click();
    await expect(slides.first()).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });

    await window.keyboard.press('ArrowRight');
    await expect(slides.nth(1)).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });

  test('Home goes to first slide', async ({ window }) => {
    await window.keyboard.press('Home');
    const slides = window.getByTestId('slide-btn');
    await expect(slides.first()).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });

  test('End goes to last slide of current song', async ({ window }) => {
    const firstItem = window.getByTestId('setlist-item').first();
    const slidesInFirst = firstItem.getByTestId('slide-btn');
    const slideCount = await slidesInFirst.count();
    expect(slideCount).toBeGreaterThanOrEqual(2);

    await window.keyboard.press('End');
    await expect(slidesInFirst.nth(slideCount - 1)).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });
});

// ── Collapse and Expand ─────────────────────────────────────────────────

test.describe('Collapse and Expand', () => {
  test('expand all items first', async ({ window }) => {
    const expandBtn = window.getByTestId('setlist-collapse-all-btn');
    await expandBtn.click();
    await window.waitForTimeout(300);
    // If slides aren't visible, toggle was in wrong state — click again
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
    await expect(window.getByTestId('slide-btn').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('click collapse-all hides all slide lists', async ({ window }) => {
    await window.getByTestId('setlist-collapse-all-btn').click();
    await window.waitForTimeout(500);

    const items = window.getByTestId('setlist-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const closed = items.nth(i).locator('[data-state="closed"]');
      await expect(closed.first()).toHaveAttribute('data-state', 'closed', {
        timeout: 5_000,
      });
    }
  });

  test('click expand-all makes all slide lists visible', async ({ window }) => {
    await window.getByTestId('setlist-collapse-all-btn').click();
    await window.waitForTimeout(500);
    await expect(window.getByTestId('slide-btn').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('click individual item trigger to collapse just that item', async ({
    window,
  }) => {
    const firstItem = window.getByTestId('setlist-item').first();
    const trigger = firstItem.locator('button[data-state="open"]').first();
    await trigger.click();
    await window.waitForTimeout(300);
    await expect(
      firstItem.locator('[data-state="closed"]').first(),
    ).toHaveAttribute('data-state', 'closed', { timeout: 5_000 });
  });

  test('click trigger again to expand it back', async ({ window }) => {
    const firstItem = window.getByTestId('setlist-item').first();
    const trigger = firstItem.locator('button[data-state="closed"]').first();
    await trigger.click();
    await window.waitForTimeout(300);
    await expect(
      firstItem.locator('[data-state="open"]').first(),
    ).toHaveAttribute('data-state', 'open', { timeout: 5_000 });
  });
});

// ── Multiple Songs ──────────────────────────────────────────────────────

test.describe('Multiple Songs', () => {
  test('open library sidebar', async ({ window }) => {
    await window.getByTestId('library-sidebar-collapsed').click();
    await expect(window.getByTestId('library-sidebar')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('add third song "Glory to God"', async ({ window }) => {
    await window.getByTestId('library-add-btn').click();
    await expect(window.getByTestId('add-song-dialog')).toBeVisible({
      timeout: 5_000,
    });

    await window.getByTestId('add-song-title').fill('Glory to God');
    await window
      .getByTestId('add-song-dialog')
      .locator('textarea')
      .first()
      .fill('Glory glory\nhallelujah\n\nForever and ever\namen');
    await window.getByTestId('add-song-submit').click();
    await expect(window.getByTestId('add-song-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('library has the new song', async ({ window }) => {
    await expect(
      window
        .getByTestId('library-song-item')
        .getByText('Glory to God', { exact: true }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('setlist count increased', async ({ window }) => {
    const count = await window.getByTestId('setlist-item').count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('close library sidebar', async ({ window }) => {
    await window
      .getByTestId('library-sidebar')
      .locator('.lucide-chevron-left')
      .first()
      .click();
    await window.waitForTimeout(500);

    // Verify sidebar collapsed
    const sidebarClosed = await window
      .getByTestId('library-sidebar')
      .evaluate(
        (el) =>
          (el as HTMLElement).offsetWidth === 0 || el.classList.contains('w-0'),
      )
      .catch(() => false);
    expect(sidebarClosed).toBe(true);
  });
});

// ── Drag Song from Library to Setlist ───────────────────────────────────

test.describe('Drag Song from Library to Setlist', () => {
  test('open library sidebar', async ({ window }) => {
    await ensureInSession(window);
    const libCollapsed = window.getByTestId('library-sidebar-collapsed');
    if (await libCollapsed.isVisible().catch(() => false)) {
      await libCollapsed.click();
    }
    await expect(window.getByTestId('library-sidebar')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('drag a library song to the setlist drop zone', async ({ window }) => {
    test.setTimeout(10_000);
    const countBefore = await window.getByTestId('setlist-item').count();

    // Find a library song item that is NOT already in the setlist
    const librarySong = window.getByTestId('library-song-item').first();
    await expect(librarySong).toBeVisible({ timeout: 5_000 });
    // Drag to the setlist drop zone
    const dropZone = window.getByTestId('setlist-drop-zone');
    await expect(dropZone).toBeVisible({ timeout: 5_000 });
    await librarySong.dragTo(dropZone, { timeout: 5_000 });
    await window.waitForTimeout(1000);

    // Verify setlist count increased
    const countAfter = await window.getByTestId('setlist-item').count();
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  test('close library sidebar after drag test', async ({ window }) => {
    const libSidebar = window.getByTestId('library-sidebar');
    const sidebarOpen = await libSidebar
      .evaluate(
        (el) =>
          (el as HTMLElement).offsetWidth > 0 && !el.classList.contains('w-0'),
      )
      .catch(() => false);
    if (sidebarOpen) {
      await libSidebar.locator('.lucide-chevron-left').first().click();
      await window.waitForTimeout(500);
    }
  });
});

// ── Context Menus ───────────────────────────────────────────────────────

test.describe('Context Menus', () => {
  test('right-click slide button shows slide context menu', async ({
    window,
  }) => {
    await ensureInSession(window);
    await window.getByTestId('setlist-collapse-all-btn').click();
    await window.waitForTimeout(500);

    await window.getByTestId('slide-btn').first().click({ button: 'right' });
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      window
        .locator('[role="menuitem"]')
        .filter({ hasText: /슬라이드 설정|Slide Settings/ })
        .first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      window
        .locator('[role="menuitem"]')
        .filter({ hasText: /슬라이드 복제|Duplicate Slide/ })
        .first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('press Escape to close context menu', async ({ window }) => {
    await window.keyboard.press('Escape');
    await window.waitForTimeout(300);
    await expect(window.locator('[role="menu"]')).not.toBeVisible({
      timeout: 5_000,
    });
  });
});
