import { test, expect } from './fixtures';
import { setupTestData, ensureInSession, dismissOverlays } from './helpers';

// Prevent worker restart on failure — skip remaining tests instead
test.describe.configure({ mode: 'serial' });

// ── Setup ───────────────────────────────────────────────────────────────

test.describe('Setup', () => {
  test('create session and songs if needed', async ({ window }) => {
    test.setTimeout(15_000);
    await setupTestData(window);
    await dismissOverlays(window);
    await expect(window.getByTestId('breadcrumb-current')).toBeVisible({
      timeout: 5_000,
    });
    const count = await window.getByTestId('setlist-item').count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

// ── Presentation ────────────────────────────────────────────────────────

test.describe('Presentation', () => {
  test('activate first slide and expand items', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);

    // Expand all items so slides are visible
    const expandBtn = window.getByTestId('setlist-collapse-all-btn');
    await expandBtn.click();
    await window.waitForTimeout(300);
    const firstSlide = window.getByTestId('slide-btn').first();
    if (!(await firstSlide.isVisible().catch(() => false))) {
      await expandBtn.click();
      await window.waitForTimeout(300);
    }
    await expect(firstSlide).toBeVisible({ timeout: 5_000 });

    // Click first slide to set known state
    await firstSlide.click();
    await expect(firstSlide).toHaveClass(/bg-active/, { timeout: 5_000 });
  });

  test('ArrowRight moves to next slide', async ({ window }) => {
    const slides = window.getByTestId('slide-btn');
    await window.keyboard.press('ArrowRight');
    await expect(slides.nth(1)).toHaveClass(/bg-active/, { timeout: 5_000 });
    // First slide should no longer be active
    await expect(slides.first()).not.toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });

  test('ArrowLeft moves back to previous slide', async ({ window }) => {
    const slides = window.getByTestId('slide-btn');
    await window.keyboard.press('ArrowLeft');
    await expect(slides.first()).toHaveClass(/bg-active/, { timeout: 5_000 });
  });

  test('Home goes to first slide', async ({ window }) => {
    const slides = window.getByTestId('slide-btn');
    // First go to second slide so Home has something to do
    await slides.nth(1).click();
    await expect(slides.nth(1)).toHaveClass(/bg-active/, { timeout: 5_000 });

    await window.keyboard.press('Home');
    await expect(slides.first()).toHaveClass(/bg-active/, { timeout: 5_000 });
  });

  test('End goes to last slide of current song', async ({ window }) => {
    // End key goes to last slide of the current song
    // We're on first slide of first song (from Home test)
    // First song has 2 slides, so End should go to slide 2
    const firstItem = window.getByTestId('setlist-item').first();
    const slidesInFirst = firstItem.getByTestId('slide-btn');
    const slideCount = await slidesInFirst.count();
    expect(slideCount).toBeGreaterThanOrEqual(2);

    await window.keyboard.press('End');
    await expect(slidesInFirst.nth(slideCount - 1)).toHaveClass(/bg-active/, {
      timeout: 5_000,
    });
  });

  test('ArrowDown moves to next song', async ({ window }) => {
    // Go back to first slide first
    await window.keyboard.press('Home');
    await window.waitForTimeout(300);

    await window.keyboard.press('ArrowDown');
    // Second setlist item should now have an active slide
    const secondItem = window.getByTestId('setlist-item').nth(1);
    await expect(secondItem.locator('.bg-active').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('B toggles blank screen on and off', async ({ window }) => {
    await window.keyboard.press('b');
    await expect(window.getByTestId('btn-blank')).toHaveAttribute(
      'aria-pressed',
      'true',
      { timeout: 5_000 },
    );
    await window.keyboard.press('b');
    await expect(window.getByTestId('btn-blank')).toHaveAttribute(
      'aria-pressed',
      'false',
      { timeout: 5_000 },
    );
  });
});

// ── Settings ────────────────────────────────────────────────────────────

test.describe('Settings', () => {
  test('open settings panel', async ({ window }) => {
    await window.getByTestId('settings-sidebar-collapsed').click();
    await expect(window.getByTestId('settings-panel')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('switch to Display tab shows font settings', async ({ window }) => {
    await window
      .getByTestId('settings-panel')
      .getByRole('button', { name: /디스플레이|Display/ })
      .click();
    await window.waitForTimeout(300);
    await expect(
      window
        .getByTestId('settings-panel')
        .getByText(/Font|폰트|Fonts|글꼴/)
        .first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('switch back to General tab shows theme buttons', async ({ window }) => {
    await window
      .getByTestId('settings-panel')
      .getByRole('button', { name: /일반|General/ })
      .click();
    await window.waitForTimeout(300);
    await expect(window.getByTestId('theme-light')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('close settings panel', async ({ window }) => {
    await window
      .getByTestId('settings-panel')
      .locator('button')
      .filter({ has: window.locator('.lucide-x') })
      .click();
    await expect(window.getByTestId('settings-panel')).toHaveClass(/w-0/, {
      timeout: 5_000,
    });
  });
});

// ── Keyboard Shortcuts ──────────────────────────────────────────────────

test.describe('Keyboard Shortcuts', () => {
  test('S opens add content dialog', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);
    await window.keyboard.press('s');
    await expect(window.getByTestId('add-content-dialog')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('Escape closes add content dialog', async ({ window }) => {
    await window.keyboard.press('Escape');
    await expect(window.getByTestId('add-content-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('Cmd+K opens global search', async ({ window }) => {
    await window.keyboard.press('Meta+k');
    await expect(window.getByTestId('global-search-dialog')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('Escape closes global search', async ({ window }) => {
    await window.keyboard.press('Escape');
    await expect(window.getByTestId('global-search-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  });
});
