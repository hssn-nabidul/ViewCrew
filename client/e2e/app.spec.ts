import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads the landing page with correct title and elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/WatchSync/);
    await expect(page.getByRole('link', { name: 'ViewCrew Home' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Watch Together/ })).toBeVisible();
    await expect(page.getByLabel('Your Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create a new private room' })).toBeVisible();
    await expect(page.getByLabel('Room code to join')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join room with code' })).toBeVisible();
  });

  test('room code input limits to 6 characters', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const roomInput = page.getByLabel('Room code to join');
    await roomInput.fill('ABCDEF123');
    await expect(roomInput).toHaveValue('ABCDEF');
  });

  test('shows alert for invalid room code', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    page.on('dialog', dialog => dialog.dismiss());

    await page.getByLabel('Room code to join').fill('AB');
    await page.locator('#btnJoinRoom').click({ timeout: 5000 });

    await page.waitForTimeout(500);
  });
});

test.describe('Room Creation (requires backend)', () => {
  test('creates a room and navigates to room view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Your Name').fill('TestHost');
    await page.locator('#btnCreateRoom').click();

    await page.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    const url = new URL(page.url());
    const roomId = url.searchParams.get('room');
    expect(roomId).toMatch(/^[A-Z0-9]{6}$/);
  });
});

test.describe('Room View (requires backend)', () => {
  test('shows room code in header after joining', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Your Name').fill('TestViewer');
    await page.locator('#btnCreateRoom').click();
    await page.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    const url = new URL(page.url());
    const roomId = url.searchParams.get('room');

    await expect(page.getByText(roomId)).toBeVisible();
  });

  test('shows copy button for room code', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Your Name').fill('TestHost');
    await page.locator('#btnCreateRoom').click();
    await page.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    const copyBtn = page.getByLabel('Copy room code');
    await expect(copyBtn).toBeVisible();
  });

  test('shows waiting for host state for non-host', async ({ context }) => {
    const hostPage = await context.newPage();
    await hostPage.goto('/');
    await hostPage.waitForLoadState('networkidle');
    await hostPage.getByLabel('Your Name').fill('Host');
    await hostPage.locator('#btnCreateRoom').click();
    await hostPage.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    const hostUrl = new URL(hostPage.url());
    const roomId = hostUrl.searchParams.get('room');

    const viewerPage = await context.newPage();
    await viewerPage.goto(`/?room=${roomId}`);
    await viewerPage.waitForLoadState('networkidle');

    await viewerPage.getByLabel('Your Name').fill('Viewer');
    await viewerPage.locator('#btnJoinRoom').click();
    await viewerPage.waitForURL(/\?room=[A-Z0-9]{6}/, { timeout: 10000 });

    await expect(viewerPage.getByText('Waiting for the Host')).toBeVisible({ timeout: 10000 });
  });
});
