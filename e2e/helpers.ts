/**
 * Shared test helpers for OpenWorship E2E tests.
 * All helpers accept `window: Page` as parameter.
 */
import type { Page } from '@playwright/test';
import { expect } from './fixtures';

/** Ensure we're inside a session. If on sessions list, click first session. Fails if no sessions exist. */
export async function ensureInSession(window: Page) {
  const breadcrumb = window.getByTestId('breadcrumb-current');
  if (await breadcrumb.isVisible().catch(() => false)) return;
  // Must find a session to click — fail if none exist
  const sessionItem = window.getByTestId('session-item').first();
  await expect(sessionItem).toBeVisible({ timeout: 5_000 });
  await sessionItem.click();
  await expect(breadcrumb).toBeVisible({ timeout: 5_000 });
}

/**
 * Idempotent setup: creates a session and 2 songs if none exist.
 * Safe to call at the start of every file — skips if data already present.
 */
export async function setupTestData(window: Page) {
  const breadcrumb = window.getByTestId('breadcrumb-current');
  const alreadyInSession = await breadcrumb.isVisible().catch(() => false);

  if (alreadyInSession) {
    // Check if there are already setlist items
    const items = await window.getByTestId('setlist-item').count();
    if (items >= 2) return; // Already set up
  }

  // If sessions exist, enter the first one
  const sessionItem = window.getByTestId('session-item').first();
  const hasSession = await sessionItem.isVisible().catch(() => false);
  if (hasSession && !alreadyInSession) {
    await sessionItem.click();
    await expect(breadcrumb).toBeVisible({ timeout: 5_000 });
    const items = await window.getByTestId('setlist-item').count();
    if (items >= 2) return;
  }

  // Create session if needed
  if (!alreadyInSession && !hasSession) {
    await window.getByTestId('session-new-btn').click();
    await window.getByTestId('session-name-input').fill('Test Session');
    await window.getByTestId('session-create-confirm').click();
    await expect(breadcrumb).toBeVisible({ timeout: 5_000 });
  }

  // Open library sidebar
  const libCollapsed = window.getByTestId('library-sidebar-collapsed');
  if (await libCollapsed.isVisible().catch(() => false)) {
    await libCollapsed.click();
    await expect(window.getByTestId('library-sidebar')).toBeVisible({
      timeout: 5_000,
    });
  }

  // Add song 1 if needed
  const songCount = await window.getByTestId('setlist-item').count();
  if (songCount < 1) {
    await window.getByTestId('library-add-btn').click();
    await expect(window.getByTestId('add-song-dialog')).toBeVisible({
      timeout: 5_000,
    });
    await window.getByTestId('add-song-title').fill('Amazing Grace');
    await window
      .getByTestId('add-song-dialog')
      .locator('textarea')
      .first()
      .fill('Amazing grace how sweet\n\nThe sound that saved');
    await window.getByTestId('add-song-submit').click();
    await expect(window.getByTestId('add-song-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  }

  // Add song 2 if needed
  const songCount2 = await window.getByTestId('setlist-item').count();
  if (songCount2 < 2) {
    await window.getByTestId('library-add-btn').click();
    await expect(window.getByTestId('add-song-dialog')).toBeVisible({
      timeout: 5_000,
    });
    await window.getByTestId('add-song-title').fill('Holy Holy');
    await window
      .getByTestId('add-song-dialog')
      .locator('textarea')
      .first()
      .fill('Holy holy holy\nLord God almighty\n\nEarly in the morning');
    await window.getByTestId('add-song-submit').click();
    await expect(window.getByTestId('add-song-dialog')).not.toBeVisible({
      timeout: 5_000,
    });
  }

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
    await window.waitForTimeout(500);
  }
}

/** Dismiss any open dialog, menu, or settings panel without side effects. */
export async function dismissOverlays(window: Page) {
  // Close settings panel if open
  const panel = window.getByTestId('settings-panel');
  const panelOpen = await panel
    .evaluate((el) => !el.classList.contains('w-0'))
    .catch(() => false);
  if (panelOpen) {
    await window.getByTestId('settings-close-btn').click();
    await window.waitForTimeout(300);
  }
  // Close AddSongDialog specifically (it blocks Escape)
  const addSongDialog = window.getByTestId('add-song-dialog');
  if (await addSongDialog.isVisible().catch(() => false)) {
    // Click the X button (first button in the dialog)
    await addSongDialog.locator('button').first().click();
    await window.waitForTimeout(500);
  }
  // Close AddContentDialog
  const addContentDialog = window.getByTestId('add-content-dialog');
  if (await addContentDialog.isVisible().catch(() => false)) {
    await window.keyboard.press('Escape');
    await window.waitForTimeout(300);
  }
  // Close library sidebar if open (check it's not collapsed via w-0 class)
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
  // Close other dialogs via Escape
  const dialog = window.locator('[role="dialog"], [role="alertdialog"]');
  if (await dialog.isVisible().catch(() => false)) {
    await window.keyboard.press('Escape');
    await window.waitForTimeout(300);
  }
  // Close context menu if open
  const menu = window.locator('[role="menu"]');
  if (await menu.isVisible().catch(() => false)) {
    await window.keyboard.press('Escape');
    await window.waitForTimeout(300);
  }
  // Un-blank if blanked
  const blankBtn = window.getByTestId('btn-blank');
  if (await blankBtn.isVisible().catch(() => false)) {
    const pressed = await blankBtn
      .getAttribute('aria-pressed')
      .catch(() => 'false');
    if (pressed === 'true') {
      await blankBtn.click();
      await window.waitForTimeout(200);
    }
  }
  // Click a safe area to defocus any input
  await window.locator('body').click({ position: { x: 200, y: 120 } });
  await window.waitForTimeout(200);
}
