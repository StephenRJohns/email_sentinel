require('dotenv').config({ path: require('path').resolve(__dirname, '../e2e.config.env') });
const { test, expect } = require('../fixtures');
const { openAddon, getFrame, expectToast, clickButton, fillField, navTo, sendTestEmail, waitForEmailInInbox, GMAIL_URL } = require('../helpers');

// ─── Pre-run requirements (manual, not automated) ────────────────────────────
//
// Before running this suite:
//   1. Gemini API key must already be configured in the add-on (via Settings).
//   2. At least one rule ("Test rule — E2E") must exist OR S4 must run first.
//   3. Run resetUserPropertiesForTesting() in Apps Script editor only if you
//      want a fully pristine run — you will then need to re-configure Gemini
//      manually before S5/S6 will pass.
//
// SMS, Chat, MCP, Calendar, Sheets, Tasks sections remain manual per policy.

const cfg = {
  email:       process.env.GOOGLE_EMAIL,
  smsProvider: process.env.SMS_PROVIDER   || '',
  chatWebhook: process.env.CHAT_WEBHOOK_URL || '',
  mcpEndpoint: process.env.MCP_ENDPOINT   || '',
};

// ─── S2 · Home card and Settings navigation ───────────────────────────────────

test('S2: home card loads with all status rows', async ({ page }) => {
  const frame = await openAddon(page);
  await expect(frame.getByText(/Free \(/)).toBeVisible();
  await expect(frame.getByText('Plan')).toBeVisible();
  await expect(frame.getByText('Monitoring')).toBeVisible();
  await expect(frame.getByText('Rules')).toBeVisible();
  await expect(frame.getByText('Gemini API key')).toBeVisible();
  await expect(frame.getByRole('button', { name: /Upgrade to Pro/i })).toBeVisible();
});

test('S2: Settings card opens and back arrow returns home', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await expect(getFrame(page).getByText('Gemini (rule evaluation)')).toBeVisible();
  await clickButton(getFrame(page), 'Home');
  await expect(getFrame(page).getByText('Plan')).toBeVisible();
});

// ─── S3 · Starter Rules ───────────────────────────────────────────────────────

test('S3: starter rules preview shows all five rule names', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Starter rules');
  const f = getFrame(page);
  for (const name of ['Urgent emails', 'Invoices & payment requests', 'Shipping & delivery updates', 'Security & account alerts', 'Bills & subscription renewals']) {
    await expect(f.getByText(name)).toBeVisible();
  }
  await clickButton(f, 'Create starter rules');
  // Toast confirms creation (exact count varies by tier/existing rules)
  await expectToast(page, 'starter rules created');
});

// ─── S4 · Create Dedicated Test Rule ─────────────────────────────────────────

test('S4: create E2E test rule', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Rules');
  await clickButton(getFrame(page), '+ New rule');
  const f = getFrame(page);
  await fillField(f, 'Rule name', 'Test rule — E2E');
  await fillField(f, 'Gmail labels', 'INBOX');
  await fillField(f, 'Rule text (plain English)', 'Any email with SENTINEL_TEST anywhere in the subject line.');
  await clickButton(f, 'Save');
  await expectToast(page, 'Rule saved');
});

// ─── S5 · Baseline Run ────────────────────────────────────────────────────────

test('S5: run check now produces a result toast', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Run check now');
  await expectToast(page, 'Check complete');
  // Navigate to Activity log and confirm an entry exists
  await clickButton(getFrame(page), 'Activity log');
  const logText = await getFrame(page).locator('body').innerText();
  expect(logText).toMatch(/baseline set|no new messages|new email/i);
});

// ─── S6+S7 · Send Test Email and Verify Match ─────────────────────────────────

test('S6+S7: test email triggers a match in the activity log', async ({ page }) => {
  const subject = 'SENTINEL_TEST — please ignore';
  await page.goto(GMAIL_URL, { waitUntil: 'domcontentloaded' });
  await sendTestEmail(page, subject, cfg.email);
  await waitForEmailInInbox(page, 'SENTINEL_TEST');

  const frame = await openAddon(page);
  await clickButton(frame, 'Run check now');
  await expectToast(page, 'match');

  await clickButton(getFrame(page), 'Activity log');
  const logText = await getFrame(page).locator('body').innerText();
  expect(logText).toMatch(/SENTINEL_TEST/i);
  expect(logText).toMatch(/MATCH/i);
});

// ─── S8 · Activity Log UI ────────────────────────────────────────────────────

test('S8: activity log has Refresh button', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Activity log');
  await expect(getFrame(page).getByRole('button', { name: 'Refresh' })).toBeVisible();
});

// ─── S9-S13 · Alert channels (all manual-only) ───────────────────────────────
// SMS sends, Chat webhooks, Calendar, Sheets, Tasks, and MCP are verified
// manually per e2e_test_plan.md. No automation here.

// ─── S14 · Help Card Navigation ──────────────────────────────────────────────

test('S14: Help card loads with all five topic buttons', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Help');
  const f = getFrame(page);
  await expect(f.getByText('emAIl Sentinel™ Help')).toBeVisible();
  for (const topic of ['Quick start & writing rules', 'Rule examples by channel', 'Alert channel setup', 'Gemini pricing & models', 'Settings & troubleshooting']) {
    await expect(f.getByRole('button', { name: topic })).toBeVisible();
  }
});

test('S14: help footer shows JJJJJ Enterprises credit', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Help');
  await expect(getFrame(page).getByText('JJJJJ Enterprises')).toBeVisible();
  await expect(getFrame(page).getByText('legal@jjjjjenterprises.com')).toBeVisible();
});

test('S14: Settings & troubleshooting topic shows GitHub Issues link', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Help');
  await clickButton(getFrame(page), 'Settings & troubleshooting');
  await expect(getFrame(page).getByText('github.com/StephenRJohns/email_sentinel/issues')).toBeVisible();
});

// ─── S15 · Start Monitoring ───────────────────────────────────────────────────

test('S15: start monitoring changes status to Running', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Start monitoring');
  await expectToast(page, 'Monitoring started');
  await expect(getFrame(page).getByText('Running')).toBeVisible();
});

// ─── S16 · Stop Monitoring ───────────────────────────────────────────────────

test('S16: stop monitoring changes status to Stopped', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Stop monitoring');
  await expectToast(page, 'Monitoring stopped');
  await expect(getFrame(page).getByText('Stopped')).toBeVisible();
});

// ─── S17 · Confirmation Dialogs ──────────────────────────────────────────────

test('S17: clear activity log requires confirmation', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Activity log');
  await clickButton(getFrame(page), 'Clear');
  await expect(getFrame(page).getByText('cannot be undone')).toBeVisible();
  await clickButton(getFrame(page), 'Cancel');
  await expect(getFrame(page).getByText('No activity yet')).not.toBeVisible();
  await clickButton(getFrame(page), 'Clear');
  await clickButton(getFrame(page), 'Clear');
  await expectToast(page, 'Log cleared');
});

test('S17: delete rule requires confirmation', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Rules');
  await getFrame(page).getByText('Test rule — E2E').click();
  await clickButton(getFrame(page), 'Delete');
  await expect(getFrame(page).getByText('cannot be undone')).toBeVisible();
  await clickButton(getFrame(page), 'Cancel');
  await expect(getFrame(page).getByText('Test rule — E2E')).toBeVisible();
  await getFrame(page).getByText('Test rule — E2E').click();
  await clickButton(getFrame(page), 'Delete');
  await clickButton(getFrame(page), 'Delete');
  await expectToast(page, 'Rule deleted');
});

test('S17: reset baseline requires confirmation', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await clickButton(getFrame(page), 'Reset baseline');
  await expect(getFrame(page).getByText('Reset the seen-message baseline')).toBeVisible();
  await clickButton(getFrame(page), 'Cancel');
  await clickButton(getFrame(page), 'Reset baseline');
  await clickButton(getFrame(page), 'Reset');
  await expectToast(page, 'baseline cleared');
});

// ─── S18-S19 · Business Hours & Max Email Age (manual) ───────────────────────
// These involve checkbox + time-field interactions that are manual-only.

// ─── S20 · Free Plan Enforcement (visibility checks only) ────────────────────

test('S20: home card shows Free plan indicator and Upgrade button', async ({ page }) => {
  const frame = await openAddon(page);
  await expect(frame.getByText(/Free \(/)).toBeVisible();
  await expect(frame.getByRole('button', { name: /Upgrade to Pro/i })).toBeVisible();
});

test('S20: founding-member scarcity counter appears on home card', async ({ page }) => {
  const frame = await openAddon(page);
  await expect(frame.getByText(/Founding-member lifetime.*\$79/)).toBeVisible();
  await expect(frame.getByText(/of 500 remaining/i)).toBeVisible();
});

test('S20: rule editor shows Pro-only labels for Chat and MCP on Free', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Rules');
  await clickButton(getFrame(page), '+ New rule');
  await expect(getFrame(page).getByText(/Google Chat webhooks.*Pro plan only/i)).toBeVisible();
  await expect(getFrame(page).getByText(/MCP servers.*Pro plan only/i)).toBeVisible();
  // Navigate away without saving
  await getFrame(page).getByRole('button', { name: 'Back' }).click();
});

test('S20: AI Suggest buttons show (Pro) suffix on Free plan', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Rules');
  await clickButton(getFrame(page), '+ New rule');
  await expect(getFrame(page).getByRole('button', { name: /Suggest rule text \(Pro\)/i })).toBeVisible();
  await clickButton(getFrame(page), 'Suggest rule text (Pro)');
  await expectToast(page, 'Upgrade to Pro');
  await getFrame(page).getByRole('button', { name: 'Back' }).click();
});

// ─── S21 · Pro Plan Unlocks (TEST_TIER=pro only) ─────────────────────────────

test.describe('S21: Pro Plan Unlocks', () => {
  test.skip((process.env.TEST_TIER || 'free').toLowerCase() !== 'pro', 'Set TEST_TIER=pro to run');

  test('S21: home card shows Pro and hides Upgrade button', async ({ page }) => {
    const frame = await openAddon(page);
    await expect(frame.getByText(/Plan:?\s*Pro/i)).toBeVisible();
    await expect(frame.getByRole('button', { name: /Upgrade to Pro/i })).toHaveCount(0);
  });

  test('S21: rule editor exposes Chat and MCP channels on Pro', async ({ page }) => {
    const frame = await openAddon(page);
    await clickButton(frame, 'Rules');
    await clickButton(getFrame(page), '+ New rule');
    await expect(getFrame(page).getByText(/Google Chat webhooks.*Pro plan only/i)).toHaveCount(0);
    await expect(getFrame(page).getByText(/MCP servers.*Pro plan only/i)).toHaveCount(0);
    await getFrame(page).getByRole('button', { name: 'Back' }).click();
  });

  test('S21: AI Suggest buttons have no (Pro) suffix on Pro', async ({ page }) => {
    const frame = await openAddon(page);
    await clickButton(frame, 'Rules');
    await clickButton(getFrame(page), '+ New rule');
    await expect(getFrame(page).getByRole('button', { name: /Suggest rule text \(Pro\)/i })).toHaveCount(0);
    await expect(getFrame(page).getByRole('button', { name: /^Suggest rule text$/i })).toBeVisible();
    await getFrame(page).getByRole('button', { name: 'Back' }).click();
  });
});
