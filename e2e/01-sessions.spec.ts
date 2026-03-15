import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

// ── Add Song Without Any Session ────────────────────────────────────────
// This must run FIRST — before any session is created

test.describe('Add Song Without Session', () => {
  test('add song to library from empty state (no sessions exist)', async ({
    window,
  }) => {
    test.setTimeout(15_000);
    // Wait for app to render
    await expect(window.getByText(/세션이 없습니다|No sessions/)).toBeVisible({
      timeout: 15_000,
    });

    // Open library sidebar
    await window.getByTestId('library-sidebar-collapsed').click();
    await expect(window.getByTestId('library-sidebar')).toBeVisible({
      timeout: 5_000,
    });

    // Add a song — should go to library only (no session to add to)
    await window.getByTestId('library-add-btn').click();
    await expect(window.getByTestId('add-song-dialog')).toBeVisible({
      timeout: 5_000,
    });

    await window.getByTestId('add-song-title').fill('Orphan Song');
    await window
      .getByTestId('add-song-dialog')
      .locator('textarea')
      .first()
      .fill('This song has no session');
    await window.getByTestId('add-song-submit').click();
    await expect(window.getByTestId('add-song-dialog')).not.toBeVisible({
      timeout: 5_000,
    });

    // Song should appear in library
    await expect(
      window
        .getByTestId('library-song-item')
        .getByText('Orphan Song', { exact: true }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('no setlist items exist (no session)', async ({ window }) => {
    // No session selected, so no setlist items should be visible
    const setlistItems = window.getByTestId('setlist-item');
    expect(await setlistItems.count()).toBe(0);
  });

  test('close library sidebar', async ({ window }) => {
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

// ── Sessions ────────────────────────────────────────────────────────────

test.describe('Sessions', () => {
  test('create session "Test Session"', async ({ window }) => {
    await window.getByTestId('session-new-btn').click();
    await window.getByTestId('session-name-input').fill('Test Session');
    await window.getByTestId('session-create-confirm').click();
    await expect(window.getByTestId('breadcrumb-current')).toHaveText(
      'Test Session',
      { timeout: 5_000 },
    );
  });

  test('navigate back to sessions list', async ({ window }) => {
    await window.getByTestId('breadcrumb-sessions').click();
    await expect(window.getByTestId('session-item')).toHaveCount(1, {
      timeout: 5_000,
    });
  });

  test('create second session "Session B"', async ({ window }) => {
    await window.getByTestId('session-new-btn').click();
    await window.getByTestId('session-name-input').fill('Session B');
    await window.getByTestId('session-create-confirm').click();
    await expect(window.getByTestId('breadcrumb-current')).toHaveText(
      'Session B',
      { timeout: 5_000 },
    );
  });

  test('switch to "Test Session"', async ({ window }) => {
    await window.getByTestId('breadcrumb-sessions').click();
    await expect(window.getByTestId('session-item')).toHaveCount(2, {
      timeout: 5_000,
    });
    const items = window.getByTestId('session-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const name = await items
        .nth(i)
        .getByTestId('session-item-name')
        .textContent();
      if (name === 'Test Session') {
        await items.nth(i).click();
        break;
      }
    }
    await expect(window.getByTestId('breadcrumb-current')).toHaveText(
      'Test Session',
      { timeout: 5_000 },
    );
  });

  test('rename "Test Session" to "Main Session"', async ({ window }) => {
    await window.getByTestId('breadcrumb-sessions').click();
    const items = window.getByTestId('session-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const name = await items
        .nth(i)
        .getByTestId('session-item-name')
        .textContent();
      if (name === 'Test Session') {
        await items.nth(i).hover();
        await items.nth(i).getByTestId('session-rename-btn').click();
        break;
      }
    }
    await window.getByTestId('session-rename-input').fill('Main Session');
    await window.getByTestId('session-rename-input').press('Enter');
    await expect(
      window.getByTestId('session-item').filter({
        has: window
          .getByTestId('session-item-name')
          .filter({ hasText: 'Main Session' }),
      }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('delete "Session B"', async ({ window }) => {
    const items = window.getByTestId('session-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const name = await items
        .nth(i)
        .getByTestId('session-item-name')
        .textContent();
      if (name === 'Session B') {
        await items.nth(i).hover();
        await items.nth(i).getByTestId('session-delete-btn').click();
        break;
      }
    }
    const alertDialog = window.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5_000 });
    await alertDialog
      .locator('button')
      .filter({ hasText: /삭제|Delete/ })
      .click();
    await expect(window.getByTestId('session-item')).toHaveCount(1, {
      timeout: 5_000,
    });
  });

  test('enter "Main Session" for subsequent tests', async ({ window }) => {
    const breadcrumb = window.getByTestId('breadcrumb-current');
    if (await breadcrumb.isVisible().catch(() => false)) {
      await expect(breadcrumb).toHaveText('Main Session', { timeout: 5_000 });
    } else {
      await window.getByTestId('session-item').first().click();
      await expect(breadcrumb).toHaveText('Main Session', { timeout: 5_000 });
    }
  });
});

// ── Add Song With Session ───────────────────────────────────────────────
// Adding songs while inside a session adds to BOTH library and setlist

test.describe('Add Song With Session', () => {
  test('open library sidebar', async ({ window }) => {
    await window.getByTestId('library-sidebar-collapsed').click();
    await expect(window.getByTestId('library-sidebar')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('add song "Amazing Grace" — goes to library AND setlist', async ({
    window,
  }) => {
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

    // Verify in library
    await expect(
      window
        .getByTestId('library-song-item')
        .getByText('Amazing Grace', { exact: true }),
    ).toBeVisible({ timeout: 5_000 });

    // Verify in setlist (added to current session)
    await expect(window.getByTestId('setlist-item')).toHaveCount(1, {
      timeout: 5_000,
    });
  });

  test('add song "Holy Holy" — also goes to setlist', async ({ window }) => {
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

    // Verify setlist now has 2 items
    await expect(window.getByTestId('setlist-item')).toHaveCount(2, {
      timeout: 5_000,
    });
  });

  test('library has all songs including orphan', async ({ window }) => {
    // Library should have 3 songs: Orphan Song (from before session) + Amazing Grace + Holy Holy
    const libCount = await window.getByTestId('library-song-item').count();
    expect(libCount).toBeGreaterThanOrEqual(3);
  });

  test('search filters songs', async ({ window }) => {
    await window.getByTestId('library-search').fill('Amazing');
    await expect(window.getByTestId('library-song-item')).toHaveCount(1, {
      timeout: 5_000,
    });
  });

  test('clear search shows all songs', async ({ window }) => {
    await window.getByTestId('library-search').fill('');
    const count = await window.getByTestId('library-song-item').count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
