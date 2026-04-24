// Connects to a Chrome instance the user launched via start_chrome.sh.
// Using connectOverCDP means the browser was started by the user (not by
// Playwright), so Google sees no automation fingerprint and does not block
// Gmail sign-in. The debug port must be open before the tests start.

const { test: base, expect, chromium } = require('@playwright/test');

const CDP_URL = 'http://localhost:9222';

const test = base.extend({
  context: async ({}, use) => {
    let browser;
    try {
      browser = await chromium.connectOverCDP(CDP_URL);
    } catch {
      throw new Error(
        `Could not connect to Chrome at ${CDP_URL}.\n` +
        'Run ./testing/run_e2e_tests.sh first, wait for Gmail to load, ' +
        'then re-run ./testing/run_e2e_tests.sh.'
      );
    }
    const ctx = browser.contexts()[0];
    if (!ctx) throw new Error('No browser context found at debug port. Is Gmail open in Chrome?');
    await use(ctx);
    // Do not close — user manages the Chrome window lifecycle.
  },

  page: async ({ context }, use) => {
    // Prefer the Gmail tab if already open, otherwise open a new page.
    const gmailPage = context.pages().find(p => p.url().includes('mail.google.com'))
      || await context.newPage();
    await use(gmailPage);
  },
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    try {
      const shotPath = testInfo.outputPath('failure.png');
      await page.screenshot({ path: shotPath, fullPage: true });
      await testInfo.attach('failure', { path: shotPath, contentType: 'image/png' });
    } catch (_) { /* page may be closed */ }
  }
});

module.exports = { test, expect };
