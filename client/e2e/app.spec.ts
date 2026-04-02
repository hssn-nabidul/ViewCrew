import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads the landing page with correct title and elements', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/WatchSync/);
    await expect(page.getByText('ViewCrew')).toBeVisible();
    await expect(page.getByText('Watch Together')).toBeVisible();
    await expect(page.getByText('Perfectly Synced')).toBeVisible();
    await expect(page.getByLabel('Your Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create a Private Room' })).toBeVisible();
    await expect(page.getByLabel('Room code to join')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join' })).toBeVisible();
  });

  test('room code input limits to 6 characters', async ({ page }) => {
    await page.goto('/');

    const roomInput = page.getByLabel('Room code to join');
    await roomInput.fill('ABCDEF123');
    await expect(roomInput).toHaveValue('ABCDEF');
  });

  test('shows error for invalid room code', async ({ page }) => {
    await page.goto('/');

    page.on('dialog', dialog => dialog.dismiss());

    await page.getByLabel('Room code to join').fill('AB');
    await page.getByRole('button', { name: 'Join' }).click();

    await expect(page.getByText('Please enter a valid 6-character room ID')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Room Creation', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Requires backend server');

  test('creates a room and navigates to room view', async ({ page, context }) => {
    await page.goto('/');

    await page.getByLabel('Your Name').fill('TestHost');
    await page.getByRole('button', { name: 'Create a Private Room' }).click();

    await page.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    const url = new URL(page.url());
    const roomId = url.searchParams.get('room');
    expect(roomId).toMatch(/^[A-Z0-9]{6}$/);
  });
});

test.describe('Room View', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Requires backend server');

  test('shows room code in header after joining', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Your Name').fill('TestViewer');
    await page.getByRole('button', { name: 'Create a Private Room' }).click();
    await page.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    const url = new URL(page.url());
    const roomId = url.searchParams.get('room');

    await expect(page.getByText(roomId)).toBeVisible();
  });

  test('shows copy button for room code', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Your Name').fill('TestHost');
    await page.getByRole('button', { name: 'Create a Private Room' }).click();
    await page.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    const copyBtn = page.getByLabel('Copy room code');
    await expect(copyBtn).toBeVisible();
  });

  test('shows waiting for host state for non-host', async ({ page, context }) => {
    const hostPage = await context.newPage();
    await hostPage.goto('/');
    await hostPage.getByLabel('Your Name').fill('Host');
    await hostPage.getByRole('button', { name: 'Create a Private Room' }).click();
    await hostPage.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    const hostUrl = new URL(hostPage.url());
    const roomId = hostUrl.searchParams.get('room');

    const viewerPage = await context.newPage();
    await viewerPage.goto(`/?room=${roomId}`);

    await viewerPage.getByLabel('Your Name').fill('Viewer');
    await viewerPage.getByRole('button', { name: 'Join' }).click();
    await viewerPage.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    await expect(viewerPage.getByText('Waiting for the Host')).toBeVisible({ timeout: 10000 });
  });
});
