import { test, expect } from './fixtures';
import { ensureInSession, dismissOverlays, setupTestData } from './helpers';

test.describe.configure({ mode: 'serial' });

test('setup: ensure session and songs exist', async ({ window }) => {
  test.setTimeout(15_000);
  await setupTestData(window);
});

// ── Language Change ────────────────────────────────────────────────────

test.describe('Language Change', () => {
  test('open settings and switch to English', async ({ window }) => {
    test.setTimeout(5_000);
    await ensureInSession(window);
    // Close any open dialog
    await window.keyboard.press('Escape');
    // Open settings panel if not already open
    const panel = window.getByTestId('settings-panel');
    const isClosed = await panel
      .evaluate((el) => el.classList.contains('w-0'))
      .catch(() => true);
    if (isClosed) {
      await window.getByTestId('settings-sidebar-collapsed').click();
    }
    await window.getByTestId('settings-tab-general').click();
    await window.waitForTimeout(300);
    await window.getByTestId('language-select').click();
    await window.waitForTimeout(300);
    await window
      .locator('[role="option"]')
      .filter({ hasText: 'English' })
      .click();
    await window.waitForTimeout(500);
    await expect(window.getByText('Theme')).toBeVisible({ timeout: 5_000 });
  });

  test('switch back to Korean', async ({ window }) => {
    test.setTimeout(5_000);
    await window.getByTestId('language-select').click();
    await window.waitForTimeout(500);
    await window
      .locator('[role="option"]')
      .filter({ hasText: '한국어' })
      .click();
    await window.waitForTimeout(1000);
    await expect(window.getByText('테마').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('close settings', async ({ window }) => {
    await window.getByTestId('settings-close-btn').click();
    await expect(window.getByTestId('settings-panel')).toHaveClass(/w-0/, {
      timeout: 5_000,
    });
  });
});

// ── Background Color Selection ─────────────────────────────────────────

test.describe('Background Color Selection', () => {
  test('click bg-selector and select a color', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);
    await window.getByTestId('bg-selector').click();
    await expect(window.locator('[role="menu"]')).toBeVisible({
      timeout: 5_000,
    });
    await window
      .locator('[role="menuitem"]')
      .filter({ hasText: /Black|검정/ })
      .click();
    await window.waitForTimeout(300);
    await expect(window.locator('[role="menu"]')).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Setlist Search ─────────────────────────────────────────────────────

test.describe('Setlist Search', () => {
  test('type "Amazing" in setlist-search filters items', async ({ window }) => {
    await ensureInSession(window);
    await dismissOverlays(window);
    await window.getByTestId('setlist-search').fill('Amazing');
    await window.waitForTimeout(500);
    await expect(window.getByTestId('setlist-item')).toHaveCount(1, {
      timeout: 5_000,
    });
    await expect(window.getByTestId('setlist-item').first()).toContainText(
      /Amazing Grace/,
      { timeout: 5_000 },
    );
  });

  test('clear search shows all items again', async ({ window }) => {
    await window.getByTestId('setlist-search').fill('');
    await window.waitForTimeout(500);
    // Should show at least the 2 songs from setupTestData
    const count = await window.getByTestId('setlist-item').count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

// ── I and A Keyboard Shortcuts ─────────────────────────────────────────

test.describe('I and A Keyboard Shortcuts', () => {
  test('I key opens add-content-dialog with Bible tab visible', async ({
    window,
  }) => {
    await ensureInSession(window);
    await dismissOverlays(window);
    await window.keyboard.press('i');
    await expect(window.getByTestId('add-content-dialog')).toBeVisible({
      timeout: 5_000,
    });
    await expect(window.getByTestId('tab-bible')).toHaveClass(/bg-background/, {
      timeout: 5_000,
    });
  });

  test('Escape closes dialog after I', async ({ window }) => {
    await window.keyboard.press('Escape');
    await expect(window.getByTestId('add-content-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('A key opens add-content-dialog with announcement textarea', async ({
    window,
  }) => {
    // Click body to defocus any element
    await window.locator('body').click({ position: { x: 200, y: 120 } });
    await window.waitForTimeout(200);
    await window.keyboard.press('a');
    await expect(window.getByTestId('add-content-dialog')).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      window.getByTestId('add-content-dialog').locator('textarea'),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Escape closes dialog after A', async ({ window }) => {
    await window.keyboard.press('Escape');
    await expect(window.getByTestId('add-content-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  });
});
