require('dotenv').config({ path: './e2e.config.env' });
const { defineConfig } = require('@playwright/test');

// Browser launch options (channel, headless, viewport, profile path) live in
// fixtures.js because they require launchPersistentContext, which the test
// runner's default context fixture does not support.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,          // persistent Chrome profile can only be opened by one process
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || '../.last_run_results.json' }],
  ],
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
});
