// 03_citations.spec.js — [[n]] inline citations, cite chips row, right panel
// Requires: frontend on http://localhost:8080
// The /chat endpoint is mocked — no backend needed.

const { test, expect } = require('@playwright/test');

const PAGE = '/Musashi%20One%20GPT.html';

const MOCK_SSE_BODY = [
  'data: {"sources":[{"document_name":"HR-VAC-2025","section_title":"Carryover Provisions"}]}',
  '',
  'data: {"text":"According to the vacation policy [[hr-vac-2025]], you may carry up to 5 days."}',
  '',
  'data: [DONE]',
  '',
].join('\n');

async function mockChat(page) {
  await page.route('**/chat', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
      body: MOCK_SSE_BODY,
    });
  });
}

async function navigateToChat(page) {
  await page.goto(PAGE);
  await page.waitForSelector('.m1-root', { timeout: 15000 });
  const signInBtn = page.locator('button', { hasText: 'Sign in with Microsoft' });
  await signInBtn.waitFor({ state: 'visible', timeout: 15000 });
  await signInBtn.click();
  await page.waitForSelector('.m1-scope-card', { timeout: 6000 });
  await page.locator('.m1-scope-card', { hasText: 'Local Policies' }).click();
  await page.waitForSelector('.m1-func-card', { timeout: 5000 });
  await page.locator('.m1-func-card.live').click();
  await page.waitForSelector('.m1-method-card', { timeout: 5000 });
  await page.locator('.m1-method-card', { hasText: 'By Region' }).click();
  await page.waitForSelector('.m1-region-tile', { timeout: 5000 });
  await page.locator('.m1-region-tile', { hasText: 'Americas' }).click();
  await page.waitForSelector('.chat-app', { timeout: 10000 });
}

// Send one message and wait for the assistant response to fully render
async function sendAndWait(page, text = 'What is the vacation carryover policy?') {
  const textarea = page.locator('.composer textarea').first();
  await textarea.click();
  await textarea.fill(text);
  await textarea.press('Enter');
  // Wait for .cite span to render — confirms assistant response with citations is complete
  await page.locator('.messages .cite').first().waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('Citations & Right Panel', () => {

  test.beforeEach(async ({ page }) => {
    await mockChat(page);
    await navigateToChat(page);
    await sendAndWait(page);
  });

  test('R-01: inline citation span renders inside assistant bubble', async ({ page }) => {
    await expect(page.locator('.messages .cite').first()).toBeVisible();
  });

  test('R-02: cite chips row appears below composer after response', async ({ page }) => {
    await expect(page.locator('.cite-chips-row')).toBeVisible();
  });

  test('R-03: cite chip shows correct document code', async ({ page }) => {
    await expect(page.locator('.cite-chip').first()).toContainText('HR-VAC-2025');
  });

  test('R-04: clicking inline citation adds right-open class to root', async ({ page }) => {
    await page.locator('.messages .cite').first().click();
    await expect(page.locator('.chat-app')).toHaveClass(/right-open/);
  });

  test('R-05: right panel shows document title', async ({ page }) => {
    await page.locator('.messages .cite').first().click();
    await expect(page.locator('.right-panel')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.right-panel')).toContainText('HR-VAC-2025');
  });

  test('R-06: right panel Metadata tab is clickable', async ({ page }) => {
    await page.locator('.messages .cite').first().click();
    await expect(page.locator('.right-panel')).toBeVisible({ timeout: 3000 });
    // Tab is a div.rp-tab with text "METADATA"
    await page.locator('.rp-tab', { hasText: 'METADATA' }).click();
    await expect(page.locator('.right-panel')).toContainText(/owner|version|updated/i, { timeout: 3000 });
  });

  test('R-07: close button removes right-open class', async ({ page }) => {
    await page.locator('.messages .cite').first().click();
    await expect(page.locator('.chat-app')).toHaveClass(/right-open/);

    // Close button inside the right panel
    await page.locator('.right-panel .icon-btn[title="Close"]').click();
    await expect(page.locator('.chat-app')).not.toHaveClass(/right-open/, { timeout: 3000 });
  });

  test('R-08: clicking cite chip button opens right panel', async ({ page }) => {
    await page.locator('.cite-chip').first().click();
    await expect(page.locator('.chat-app')).toHaveClass(/right-open/);
  });

  test('R-09: Ctrl+. toggles right panel open', async ({ page }) => {
    // Panel starts closed
    await expect(page.locator('.chat-app')).not.toHaveClass(/right-open/);
    await page.keyboard.press('Control+.');
    await expect(page.locator('.chat-app')).toHaveClass(/right-open/, { timeout: 3000 });
  });

});
