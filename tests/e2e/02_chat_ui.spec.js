// 02_chat_ui.spec.js — Chat Agent UI: welcome, composer, streaming, sidebar, theme
// Requires: frontend on http://localhost:8080
// The /chat endpoint is mocked — no backend needed.

const { test, expect } = require('@playwright/test');

const PAGE = '/Musashi%20One%20GPT.html';

// Fixed SSE mock returned for every /chat request
const MOCK_SSE_BODY = [
  'data: {"sources":[{"document_name":"HR-VAC-2025","section_title":"Carryover Provisions"}]}',
  '',
  'data: {"text":"According to the vacation policy [[hr-vac-2025]], you may carry up to 5 days."}',
  '',
  'data: [DONE]',
  '',
].join('\n');

// Mock the chat API before any request is made
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

// Navigate through the full 5-step flow to land on the chat screen.
// The landing animates for ~2.5 s, then a "Sign in with Microsoft" button
// appears. Clicking it fires onEnter() after a further 1400 ms delay.
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

test.describe('Chat Agent UI', () => {

  test.beforeEach(async ({ page }) => {
    await mockChat(page);
    await navigateToChat(page);
  });

  test('C-01: welcome screen shows greeting', async ({ page }) => {
    await expect(page.locator('.welcome')).toBeVisible();
    await expect(page.locator('.welcome')).toContainText('Hi,');
    await expect(page.locator('.welcome')).toContainText('Guest');
  });

  test('C-02: template category tabs update the grid', async ({ page }) => {
    // Tabs use class .templates-tab (not button elements)
    const tabs = page.locator('.templates-tab');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(1);

    for (let i = 0; i < count; i++) {
      await tabs.nth(i).click();
      await expect(page.locator('.template-card').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('C-03: clicking a template sends the message directly', async ({ page }) => {
    // onPickTemplate() calls sendMessage() immediately — it does NOT pre-fill the textarea
    await page.locator('.template-card').first().click();
    // The message is sent: user bubble appears in .messages
    await expect(page.locator('.messages')).toBeVisible({ timeout: 5000 });
    const msgCount = await page.locator('.messages .bubble, .messages [class*="bubble"]').count();
    expect(msgCount).toBeGreaterThan(0);
  });

  test('C-04: sending a message shows user text and delivers assistant response', async ({ page }) => {
    const textarea = page.locator('.composer textarea').first();
    await textarea.click();
    await textarea.fill('What is the vacation policy?');
    await textarea.press('Enter');

    // User message visible
    await expect(page.locator('.messages')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.messages').getByText('What is the vacation policy?')).toBeVisible();
    // Assistant response arrives — scope to assistant bubble to avoid strict-mode clash with user text
    await expect(page.locator('.messages .bubble.assistant-prose')).toContainText(/vacation policy/i, { timeout: 10000 });
  });

  test('C-05: streaming completes and assistant message appears', async ({ page }) => {
    const textarea = page.locator('.composer textarea').first();
    await textarea.click();
    await textarea.fill('What is the vacation policy?');
    await textarea.press('Enter');

    // Wait for thinking indicator to disappear
    await expect(page.locator('.thinking-row')).not.toBeVisible({ timeout: 10000 });

    // Assistant message in list
    const messages = page.locator('.messages');
    await expect(messages).toContainText('vacation policy', { timeout: 5000 });
  });

  test('C-06: stop button is visible while streaming', async ({ page }) => {
    // Override mock with a delayed response so isStreaming=true has time to render
    await page.route('**/chat', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
        return;
      }
      await new Promise(r => setTimeout(r, 600));
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
        body: MOCK_SSE_BODY,
      });
    });

    const textarea = page.locator('.composer textarea').first();
    await textarea.click();
    await textarea.fill('Tell me about leave policy');
    await textarea.press('Enter');

    // Stop button should appear while server hasn't responded yet
    await expect(page.locator('.send-btn.stop')).toBeVisible({ timeout: 5000 });
  });

  test('C-07: new chat button clears messages and shows welcome', async ({ page }) => {
    // Send a message first
    const textarea = page.locator('.composer textarea').first();
    await textarea.click();
    await textarea.fill('Test question');
    await textarea.press('Enter');
    await expect(page.locator('.thinking-row')).not.toBeVisible({ timeout: 10000 });

    // Click "New chat" in sidebar
    await page.locator('.new-chat-btn').click();
    await expect(page.locator('.welcome')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.messages')).not.toBeVisible();
  });

  test('C-08: sidebar collapse adds class to root', async ({ page }) => {
    // First toggle button in topbar collapses sidebar
    const toggleBtn = page.locator('.topbar .icon-btn').first();
    await toggleBtn.click();
    await expect(page.locator('.chat-app')).toHaveClass(/sidebar-collapsed/);
  });

  test('C-09: sidebar expand removes collapsed class', async ({ page }) => {
    const toggleBtn = page.locator('.topbar .icon-btn').first();
    await toggleBtn.click();
    await expect(page.locator('.chat-app')).toHaveClass(/sidebar-collapsed/);
    await toggleBtn.click();
    await expect(page.locator('.chat-app')).not.toHaveClass(/sidebar-collapsed/);
  });

  test('C-10: theme toggle switches data-theme attribute', async ({ page }) => {
    // Open profile dropdown
    await page.locator('.profile-btn').click();
    await page.waitForSelector('.profile-menu', { timeout: 3000 });

    const root = page.locator('.chat-app');
    const currentTheme = await root.getAttribute('data-theme');

    // Click light/dark mode menu item
    await page.locator('.menu-item', { hasText: /mode/i }).click();

    const newTheme = await root.getAttribute('data-theme');
    expect(newTheme).not.toBe(currentTheme);
    expect(['light', 'dark']).toContain(newTheme);
  });

  test('C-11: pressing ? opens keyboard shortcuts modal', async ({ page }) => {
    // Focus outside textarea so ? is not typed
    await page.locator('.topbar').click();
    await page.keyboard.press('?');
    // Modal should appear
    await expect(page.locator('.shortcuts-modal, [data-screen-label="Shortcuts"], .modal')).toBeVisible({ timeout: 3000 });
  });

  test('C-12: pressing Escape closes the shortcuts modal', async ({ page }) => {
    await page.locator('.topbar').click();
    await page.keyboard.press('?');
    await page.waitForSelector('.shortcuts-modal, .modal', { timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('.shortcuts-modal, .modal')).not.toBeVisible({ timeout: 3000 });
  });

  test('C-13: Ctrl+K triggers new chat', async ({ page }) => {
    // Send a message so there is chat history to clear
    const textarea = page.locator('.composer textarea').first();
    await textarea.click();
    await textarea.fill('Test question for Ctrl+K');
    await textarea.press('Enter');
    await expect(page.locator('.thinking-row')).not.toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Control+k');
    await expect(page.locator('.welcome')).toBeVisible({ timeout: 3000 });
  });

});
