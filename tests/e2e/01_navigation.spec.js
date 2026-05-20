// 01_navigation.spec.js — Landing → Scope → Function → Region → Chat flow
// Requires: frontend on http://localhost:8080

const { test, expect } = require('@playwright/test');

const PAGE = '/Musashi%20One%20GPT.html';

// Wait for React + Babel to mount (CDN compilation can take several seconds)
async function waitForApp(page) {
  await page.waitForSelector('.m1-root', { timeout: 15000 });
}

// The landing screen animates letters for ~2.5 s then reveals a "Sign in with
// Microsoft" button. Clicking it triggers onEnter() after a 1400 ms delay.
async function clickLandingEnter(page) {
  const signInBtn = page.locator('button', { hasText: 'Sign in with Microsoft' });
  await signInBtn.waitFor({ state: 'visible', timeout: 15000 });
  await signInBtn.click();
  // 1400 ms delay inside handleSignIn before onEnter() fires
  await page.waitForSelector('.m1-scope-card', { timeout: 6000 });
}

test.describe('Navigation Flow', () => {

  test('N-01: page loads with correct title and root element', async ({ page }) => {
    await page.goto(PAGE);
    await waitForApp(page);
    await expect(page).toHaveTitle('Musashi One GPT');
    await expect(page.locator('.m1-root')).toBeVisible();
  });

  test('N-02: clicking Sign-in on landing shows scope selection', async ({ page }) => {
    await page.goto(PAGE);
    await waitForApp(page);
    await clickLandingEnter(page);
    await expect(page.locator('.m1-scope-card').first()).toBeVisible();
  });

  test('N-03: selecting Local Policies shows function tiles', async ({ page }) => {
    await page.goto(PAGE);
    await waitForApp(page);
    await clickLandingEnter(page);

    await page.locator('.m1-scope-card', { hasText: 'Local Policies' }).click();
    await expect(page.locator('.m1-func-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('N-04: selecting HR shows method tiles', async ({ page }) => {
    await page.goto(PAGE);
    await waitForApp(page);
    await clickLandingEnter(page);
    await page.locator('.m1-scope-card', { hasText: 'Local Policies' }).click();
    await page.waitForSelector('.m1-func-card', { timeout: 5000 });

    await page.locator('.m1-func-card.live').click();
    await expect(page.locator('.m1-method-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('N-05: selecting By Region shows region tiles', async ({ page }) => {
    await page.goto(PAGE);
    await waitForApp(page);
    await clickLandingEnter(page);
    await page.locator('.m1-scope-card', { hasText: 'Local Policies' }).click();
    await page.waitForSelector('.m1-func-card', { timeout: 5000 });
    await page.locator('.m1-func-card.live').click();
    await page.waitForSelector('.m1-method-card', { timeout: 5000 });

    await page.locator('.m1-method-card', { hasText: 'By Region' }).click();
    await expect(page.locator('.m1-region-tile').first()).toBeVisible({ timeout: 5000 });
  });

  test('N-06: selecting Americas starts connecting animation', async ({ page }) => {
    await page.goto(PAGE);
    await waitForApp(page);
    await clickLandingEnter(page);
    await page.locator('.m1-scope-card', { hasText: 'Local Policies' }).click();
    await page.waitForSelector('.m1-func-card', { timeout: 5000 });
    await page.locator('.m1-func-card.live').click();
    await page.waitForSelector('.m1-method-card', { timeout: 5000 });
    await page.locator('.m1-method-card', { hasText: 'By Region' }).click();
    await page.waitForSelector('.m1-region-tile', { timeout: 5000 });

    await page.locator('.m1-region-tile', { hasText: 'Americas' }).click();
    // Connecting panel or chat-app should appear within 5 s
    await expect(
      page.locator('.chat-app, [data-screen-label="Connecting"]')
    ).toBeVisible({ timeout: 8000 });
  });

  test('N-07: chat UI loads after connecting animation', async ({ page }) => {
    await page.goto(PAGE);
    await waitForApp(page);
    await clickLandingEnter(page);
    await page.locator('.m1-scope-card', { hasText: 'Local Policies' }).click();
    await page.waitForSelector('.m1-func-card', { timeout: 5000 });
    await page.locator('.m1-func-card.live').click();
    await page.waitForSelector('.m1-method-card', { timeout: 5000 });
    await page.locator('.m1-method-card', { hasText: 'By Region' }).click();
    await page.waitForSelector('.m1-region-tile', { timeout: 5000 });
    await page.locator('.m1-region-tile', { hasText: 'Americas' }).click();

    // Chat app renders after ~1.4 s connecting transition
    await expect(page.locator('.chat-app')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('N-08: back button in chat returns to region panel', async ({ page }) => {
    await page.goto(PAGE);
    await waitForApp(page);
    await clickLandingEnter(page);
    await page.locator('.m1-scope-card', { hasText: 'Local Policies' }).click();
    await page.waitForSelector('.m1-func-card', { timeout: 5000 });
    await page.locator('.m1-func-card.live').click();
    await page.waitForSelector('.m1-method-card', { timeout: 5000 });
    await page.locator('.m1-method-card', { hasText: 'By Region' }).click();
    await page.waitForSelector('.m1-region-tile', { timeout: 5000 });
    await page.locator('.m1-region-tile', { hasText: 'Americas' }).click();
    await page.waitForSelector('.chat-app', { timeout: 10000 });

    await page.locator('.icon-btn[title="Back to HR selection"]').click();
    await expect(page.locator('.chat-app')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('.m1-region-tile').first()).toBeVisible({ timeout: 5000 });
  });

});
