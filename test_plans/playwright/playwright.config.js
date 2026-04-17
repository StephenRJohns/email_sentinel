require('dotenv').config({ path: './e2e.config.env' });
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    headless: false,        // must be headed — Google blocks headless login
    channel: 'chrome',
    userDataDir: process.env.CHROME_PROFILE_PATH,
    viewport: { width: 1400, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
