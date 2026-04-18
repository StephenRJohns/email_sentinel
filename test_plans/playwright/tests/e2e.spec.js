require('dotenv').config({ path: require('path').resolve(__dirname, '../e2e.config.env') });
const { test, expect } = require('@playwright/test');
const { openAddon, getFrame, expectToast, clickButton, fillField, navTo, sendTestEmail, waitForEmailInInbox, GMAIL_URL } = require('../helpers');

const cfg = {
  email:          process.env.GOOGLE_EMAIL,
  geminiKey:      process.env.GEMINI_API_KEY,
  smsProvider:    process.env.SMS_PROVIDER        || '',
  smsApiKey:      process.env.SMS_API_KEY         || '',
  smsSid:         process.env.SMS_ACCOUNT_SID     || '',
  smsAuth:        process.env.SMS_AUTH_TOKEN      || '',
  smsFrom:        process.env.SMS_FROM_NUMBER     || '',
  smsUsername:    process.env.SMS_USERNAME        || '',
  smsVonageSecret:process.env.SMS_VONAGE_SECRET   || '',
  smsWebhook:     process.env.SMS_WEBHOOK_URL     || '',
  smsTestNumber:  process.env.SMS_TEST_NUMBER     || '',
  chatName:       process.env.CHAT_SPACE_NAME     || '',
  chatWebhook:    process.env.CHAT_WEBHOOK_URL    || '',
  mcpName:        process.env.MCP_NAME            || '',
  mcpType:        process.env.MCP_TYPE            || '',
  mcpEndpoint:    process.env.MCP_ENDPOINT        || '',
  mcpAuth:        process.env.MCP_AUTH_TOKEN      || '',
};

// ─── Section 2 · Initial Settings Setup ──────────────────────────────────────

test('S2: open add-on and verify initial state', async ({ page }) => {
  const frame = await openAddon(page);
  await expect(frame.getByText('Stopped')).toBeVisible();
  await expect(frame.getByText('NOT configured')).toBeVisible();
  await expect(frame.getByText('Open Settings')).toBeVisible();
});

test('S2: configure Gemini key and verify connection', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await fillField(frame, 'Gemini API key', cfg.geminiKey);
  await expect(frame.getByText('gemini-2.5-flash')).toBeVisible();
  await clickButton(frame, 'Save settings');
  await expectToast(page, 'Settings saved');
  await clickButton(frame, 'Test Gemini');
  await expectToast(page, 'Gemini OK');
});

test('S2: home card shows Configured after saving key', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await clickButton(frame, 'Home'); // or back arrow
  await expect(frame.getByText('Configured')).toBeVisible();
});

// ─── Section 3 · Starter Rules ────────────────────────────────────────────────

test('S3: create starter rules', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Starter rules');
  for (const name of ['Urgent emails', 'Invoices & payment requests', 'Shipping & delivery updates', 'Security & account alerts', 'Bills & subscription renewals']) {
    await expect(frame.getByText(name)).toBeVisible();
  }
  await clickButton(frame, 'Create starter rules');
  await expectToast(page, '5 starter rules created');
  // Verify all 5 show as OFF
  await navTo(page, 'Rules');
  const frame2 = getFrame(page);
  await expect(frame2.getByText('OFF')).toHaveCount(5, { timeout: 10_000 });
});

// ─── Section 4 · Create Dedicated Test Rule ───────────────────────────────────

test('S4: create E2E test rule', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Rules');
  const frame2 = getFrame(page);
  await clickButton(frame2, '+ New rule');
  const frame3 = getFrame(page);
  await fillField(frame3, 'Rule name', 'Test rule — E2E');
  await fillField(frame3, 'Gmail labels', 'INBOX');
  await fillField(frame3, 'Rule text', 'Any email with SENTINEL_TEST anywhere in the subject line.');
  await clickButton(frame3, 'Save');
  await expectToast(page, 'Rule saved');
  // Rule should appear as ON
  const frame4 = getFrame(page);
  await expect(frame4.getByText('Test rule — E2E')).toBeVisible();
  await expect(frame4.getByText('ON').first()).toBeVisible();
});

// ─── Section 5 · Baseline Run ─────────────────────────────────────────────────

test('S5: baseline run shows no matches', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Run check now');
  await expectToast(page, 'match');
  await clickButton(getFrame(page), 'Activity log');
  const frame2 = getFrame(page);
  const logText = await frame2.locator('body').innerText();
  expect(logText).toMatch(/baseline set|no new messages/i);
  expect(logText).not.toMatch(/MATCH/i);
});

// ─── Section 6 & 7 · Send Test Email and Verify Match ─────────────────────────

test('S6+S7: test email triggers a match', async ({ page }) => {
  const subject = 'SENTINEL_TEST — please ignore';
  await page.goto(GMAIL_URL, { waitUntil: 'networkidle' });
  await sendTestEmail(page, subject, cfg.email);
  await waitForEmailInInbox(page, 'SENTINEL_TEST');

  // Return to add-on and run check
  const frame = await openAddon(page);
  await clickButton(frame, 'Run check now');
  await expectToast(page, '1 match');

  // Verify activity log
  await clickButton(getFrame(page), 'Activity log');
  const logText = await getFrame(page).locator('body').innerText();
  expect(logText).toMatch(/SENTINEL_TEST/i);
  expect(logText).toMatch(/MATCH/i);
  expect(logText).not.toMatch(/SMS alert|Chat alert|Calendar|Sheets|Task created|MCP alert/i);
});

// ─── Section 8 · Activity Log UI ─────────────────────────────────────────────

test('S8: activity log UI controls', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Activity log');
  const f = getFrame(page);
  await expect(f.getByRole('button', { name: 'Refresh' })).toBeVisible();
  // Home button present only when back arrow is absent
  const backArrow = f.locator('[aria-label="Back"], [data-action="back"]');
  const homeBtn   = f.getByRole('button', { name: /Home/i });
  const hasBack = await backArrow.isVisible().catch(() => false);
  if (!hasBack) {
    await expect(homeBtn).toBeVisible();
  }
});

// ─── Section 9 · SMS Alert Channel (optional) ────────────────────────────────

test.describe('S9: SMS alert channel @optional', () => {
  test.skip(!cfg.smsProvider, 'SMS_PROVIDER not configured');

  test('configure SMS provider and send test message', async ({ page }) => {
    const frame = await openAddon(page);
    await clickButton(frame, 'Settings');
    const f = getFrame(page);
    await f.getByLabel('SMS provider').selectOption(cfg.smsProvider);
    if (cfg.smsApiKey)      await fillField(f, 'API key',       cfg.smsApiKey);
    if (cfg.smsSid)         await fillField(f, 'Account SID',   cfg.smsSid);
    if (cfg.smsAuth)        await fillField(f, 'Auth token',     cfg.smsAuth);
    if (cfg.smsFrom)        await fillField(f, 'From number',    cfg.smsFrom);
    if (cfg.smsUsername)    await fillField(f, 'Username',       cfg.smsUsername);
    if (cfg.smsVonageSecret)await fillField(f, 'API secret',     cfg.smsVonageSecret);
    if (cfg.smsWebhook)     await fillField(f, 'Webhook URL',    cfg.smsWebhook);

    // Add recipient via add/edit/delete card
    await clickButton(f, 'Add recipient');
    const f2 = getFrame(page);
    await fillField(f2, 'Name', 'E2E Phone');
    await fillField(f2, 'Number', cfg.smsTestNumber);
    await clickButton(f2, 'Save');

    await fillField(getFrame(page), 'Send test SMS to', cfg.smsTestNumber);
    await clickButton(getFrame(page), 'Save settings');
    await expectToast(page, 'Settings saved');
    await clickButton(getFrame(page), 'Send test SMS');
    await expectToast(page, 'Test SMS sent');
  });

  test('rule triggers SMS alert', async ({ page }) => {
    // Enable SMS on test rule
    const frame = await openAddon(page);
    await clickButton(frame, 'Rules');
    await getFrame(page).getByText('Test rule — E2E').click();
    const f = getFrame(page);
    await f.getByLabel('E2E Phone').check();
    await clickButton(f, 'Save');

    await sendTestEmail(page, 'SENTINEL_TEST SMS', cfg.email);
    await waitForEmailInInbox(page, 'SENTINEL_TEST SMS');
    await clickButton(getFrame(page), 'Run check now');
    await expectToast(page, '1 match');
    const logText = await getFrame(page).locator('body').innerText().catch(() => '');
    expect(logText).toMatch(/SMS alert sent/i);
  });
});

// ─── Section 10 · Google Chat Alert Channel (optional) ───────────────────────

test.describe('S10: Google Chat alert channel @optional', () => {
  test.skip(!cfg.chatWebhook, 'CHAT_WEBHOOK_URL not configured');

  test('configure Chat space and trigger alert', async ({ page }) => {
    const frame = await openAddon(page);
    await clickButton(frame, 'Settings');
    await clickButton(getFrame(page), 'Add Chat space');
    const f = getFrame(page);
    await fillField(f, 'Space name', cfg.chatName);
    await fillField(f, 'Webhook URL', cfg.chatWebhook);
    await clickButton(f, 'Save');
    await clickButton(getFrame(page), 'Save settings');
    await expectToast(page, 'Settings saved');

    // Enable on test rule
    await clickButton(getFrame(page), 'Rules');
    await getFrame(page).getByText('Test rule — E2E').click();
    await getFrame(page).getByLabel(cfg.chatName).check();
    await clickButton(getFrame(page), 'Save');

    await sendTestEmail(page, 'SENTINEL_TEST Chat', cfg.email);
    await waitForEmailInInbox(page, 'SENTINEL_TEST Chat');
    await clickButton(getFrame(page), 'Run check now');
    await expectToast(page, '1 match');
    const logText = await getFrame(page).locator('body').innerText().catch(() => '');
    expect(logText).toMatch(/Chat alert sent/i);
  });
});

// ─── Section 11 · Google Calendar (optional) ─────────────────────────────────

test.describe('S11: Google Calendar alert channel @optional', () => {
  test('rule creates calendar event', async ({ page }) => {
    const frame = await openAddon(page);
    await clickButton(frame, 'Rules');
    await getFrame(page).getByText('Test rule — E2E').click();
    await getFrame(page).getByLabel(/Google Calendar/i).check();
    await clickButton(getFrame(page), 'Save');

    await sendTestEmail(page, 'SENTINEL_TEST Calendar', cfg.email);
    await waitForEmailInInbox(page, 'SENTINEL_TEST Calendar');
    await clickButton(getFrame(page), 'Run check now');
    await expectToast(page, '1 match');
    const logText = await getFrame(page).locator('body').innerText().catch(() => '');
    expect(logText).toMatch(/Calendar event created/i);
  });
});

// ─── Section 12 · Sheets & Tasks (optional) ──────────────────────────────────

test.describe('S12: Sheets & Tasks alert channels @optional', () => {
  test('rule appends Sheets row', async ({ page }) => {
    const frame = await openAddon(page);
    await clickButton(frame, 'Rules');
    await getFrame(page).getByText('Test rule — E2E').click();
    await getFrame(page).getByLabel(/Google Sheets/i).check();
    await clickButton(getFrame(page), 'Save');

    await sendTestEmail(page, 'SENTINEL_TEST Sheets', cfg.email);
    await waitForEmailInInbox(page, 'SENTINEL_TEST Sheets');
    await clickButton(getFrame(page), 'Run check now');
    await expectToast(page, '1 match');
    const logText = await getFrame(page).locator('body').innerText().catch(() => '');
    expect(logText).toMatch(/Sheets row appended|Auto-created alert spreadsheet/i);
  });

  test('rule creates Tasks entry', async ({ page }) => {
    const frame = await openAddon(page);
    await clickButton(frame, 'Rules');
    await getFrame(page).getByText('Test rule — E2E').click();
    await getFrame(page).getByLabel(/Google Tasks/i).check();
    await clickButton(getFrame(page), 'Save');

    await sendTestEmail(page, 'SENTINEL_TEST Tasks', cfg.email);
    await waitForEmailInInbox(page, 'SENTINEL_TEST Tasks');
    await clickButton(getFrame(page), 'Run check now');
    await expectToast(page, '1 match');
    const logText = await getFrame(page).locator('body').innerText().catch(() => '');
    expect(logText).toMatch(/Task created/i);
  });
});

// ─── Section 13 · MCP Server (optional) ──────────────────────────────────────

test.describe('S13: MCP server alert channel @optional', () => {
  test.skip(!cfg.mcpEndpoint, 'MCP_ENDPOINT not configured');

  test('configure MCP server and trigger alert', async ({ page }) => {
    const frame = await openAddon(page);
    await clickButton(frame, 'Settings');
    await clickButton(getFrame(page), 'Add MCP server');
    const f = getFrame(page);
    await fillField(f, 'Name', cfg.mcpName);
    await f.getByLabel('Type').selectOption(cfg.mcpType);
    await clickButton(f, 'Load defaults');
    await fillField(getFrame(page), 'Endpoint', cfg.mcpEndpoint);
    await fillField(getFrame(page), 'Auth token', cfg.mcpAuth);
    await clickButton(getFrame(page), 'Save');
    await clickButton(getFrame(page), 'Save settings');
    await expectToast(page, 'Settings saved');

    // Enable on test rule
    await clickButton(getFrame(page), 'Rules');
    await getFrame(page).getByText('Test rule — E2E').click();
    await getFrame(page).getByLabel(cfg.mcpName).check();
    await clickButton(getFrame(page), 'Save');

    await sendTestEmail(page, 'SENTINEL_TEST MCP', cfg.email);
    await waitForEmailInInbox(page, 'SENTINEL_TEST MCP');
    await clickButton(getFrame(page), 'Run check now');
    await expectToast(page, '1 match');
    const logText = await getFrame(page).locator('body').innerText().catch(() => '');
    expect(logText).toMatch(/MCP alert sent/i);
  });

  test('MCP error path logs failure', async ({ page }) => {
    const frame = await openAddon(page);
    await clickButton(frame, 'Settings');
    // Find and edit the MCP server
    await getFrame(page).getByText(cfg.mcpName).click();
    await fillField(getFrame(page), 'Endpoint', 'https://invalid.example.invalid');
    await clickButton(getFrame(page), 'Save');
    await clickButton(getFrame(page), 'Save settings');

    await sendTestEmail(page, 'SENTINEL_TEST MCP fail', cfg.email);
    await waitForEmailInInbox(page, 'SENTINEL_TEST MCP fail');
    await clickButton(getFrame(page), 'Run check now');
    const logText = await getFrame(page).locator('body').innerText().catch(() => '');
    expect(logText).toMatch(/FAILED/i);

    // Restore valid endpoint
    await clickButton(getFrame(page), 'Settings');
    await getFrame(page).getByText(cfg.mcpName).click();
    await fillField(getFrame(page), 'Endpoint', cfg.mcpEndpoint);
    await clickButton(getFrame(page), 'Save');
    await clickButton(getFrame(page), 'Save settings');
  });
});

// ─── Section 14 · Help Card Navigation ───────────────────────────────────────

test('S14: help card loads all five topics', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Help');
  const f = getFrame(page);
  await expect(f.getByText('emAIl Sentinel™ Help')).toBeVisible();
  for (const topic of ['Quick start & writing rules', 'Rule examples by channel', 'Alert channel setup', 'Gemini pricing & models', 'Settings & troubleshooting']) {
    await expect(f.getByRole('button', { name: topic })).toBeVisible();
  }
});

test('S14: help topics contain expected content', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Help');

  await clickButton(getFrame(page), 'Quick start & writing rules');
  await expect(getFrame(page).getByText(/Suggest rule text/i)).toBeVisible();

  await clickButton(getFrame(page), 'Back');
  await clickButton(getFrame(page), 'Gemini pricing & models');
  const f = getFrame(page);
  await expect(f.getByText('gemini-2.5-flash')).toBeVisible();

  await clickButton(getFrame(page), 'Back');
  await clickButton(getFrame(page), 'Settings & troubleshooting');
  await expect(getFrame(page).getByText('github.com/StephenRJohns/email_sentinel/issues')).toBeVisible();
});

test('S14: help card footer shows JJJJJ credit', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Help');
  await expect(getFrame(page).getByText('JJJJJ Enterprises')).toBeVisible();
  await expect(getFrame(page).getByText('legal@jjjjjenterprises.com')).toBeVisible();
});

// ─── Section 15 · Start Monitoring ───────────────────────────────────────────

test('S15: start monitoring', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Start monitoring');
  await expectToast(page, 'Monitoring started');
  await expect(getFrame(page).getByText('Running')).toBeVisible();
});

// ─── Section 16 · Stop Monitoring ────────────────────────────────────────────

test('S16: stop monitoring', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Stop monitoring');
  await expectToast(page, 'Monitoring stopped');
  await expect(getFrame(page).getByText('Stopped')).toBeVisible();
});

// ─── Section 17 · Confirmation Dialogs ───────────────────────────────────────

test('S17: clear activity log requires confirmation', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Activity log');
  await clickButton(getFrame(page), 'Clear');
  await expect(getFrame(page).getByText('cannot be undone')).toBeVisible();
  await clickButton(getFrame(page), 'Cancel');
  // Log should still have entries
  await expect(getFrame(page).getByText('No activity yet')).not.toBeVisible();
  // Now confirm clear
  await clickButton(getFrame(page), 'Clear');
  await clickButton(getFrame(page), 'Clear'); // confirm button
  await expectToast(page, 'Log cleared');
});

test('S17: delete rule requires confirmation', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Rules');
  await getFrame(page).getByText('Test rule — E2E').click();
  await clickButton(getFrame(page), 'Delete');
  await expect(getFrame(page).getByText('cannot be undone')).toBeVisible();
  await clickButton(getFrame(page), 'Cancel');
  // Rule still present
  await expect(getFrame(page).getByText('Test rule — E2E')).toBeVisible();
  // Confirm delete
  await getFrame(page).getByText('Test rule — E2E').click();
  await clickButton(getFrame(page), 'Delete');
  await clickButton(getFrame(page), 'Delete'); // confirm
  await expectToast(page, 'Rule deleted');
});

test('S17: reset baseline requires confirmation', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await clickButton(getFrame(page), 'Reset baseline');
  await expect(getFrame(page).getByText('Reset the seen-message baseline')).toBeVisible();
  await clickButton(getFrame(page), 'Cancel');
  // Confirm reset
  await clickButton(getFrame(page), 'Reset baseline');
  await clickButton(getFrame(page), 'Reset');
  await expectToast(page, 'baseline cleared');
});

// ─── Section 18 · Business Hours Gate ────────────────────────────────────────

test('S18: business hours gate skips check outside window', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  const f = getFrame(page);
  await f.getByLabel(/Only check during business hours/i).check();
  await fillField(f, 'Start', '01:00');
  await fillField(f, 'End',   '01:30');
  await clickButton(f, 'Save settings');
  await expectToast(page, 'Settings saved');

  await clickButton(getFrame(page), 'Run check now');
  await clickButton(getFrame(page), 'Activity log');
  const logText = await getFrame(page).locator('body').innerText();
  expect(logText).toMatch(/Outside business hours/i);

  // Restore
  await clickButton(getFrame(page), 'Settings');
  await getFrame(page).getByLabel(/Only check during business hours/i).uncheck();
  await clickButton(getFrame(page), 'Save settings');
});

// ─── Section 19 · Max Email Age Filter ───────────────────────────────────────

test('S19: max email age persists and filters baseline', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await fillField(getFrame(page), 'Only check emails newer than', '1');
  await clickButton(getFrame(page), 'Save settings');
  await expectToast(page, 'Settings saved');

  // Reload Settings and verify persistence
  await clickButton(getFrame(page), 'Settings');
  await expect(getFrame(page).getByLabel(/Only check emails newer than/i)).toHaveValue('1');

  // Restore to 30
  await fillField(getFrame(page), 'Only check emails newer than', '30');
  await clickButton(getFrame(page), 'Save settings');
  await expectToast(page, 'Settings saved');
});

test('S19: invalid max email age inputs are clamped', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await fillField(getFrame(page), 'Only check emails newer than', '0');
  await clickButton(getFrame(page), 'Save settings');
  await clickButton(getFrame(page), 'Settings');
  const val = await getFrame(page).getByLabel(/Only check emails newer than/i).inputValue();
  expect(Number(val)).toBeGreaterThanOrEqual(1);

  await fillField(getFrame(page), 'Only check emails newer than', 'abc');
  await clickButton(getFrame(page), 'Save settings');
  await clickButton(getFrame(page), 'Settings');
  const val2 = await getFrame(page).getByLabel(/Only check emails newer than/i).inputValue();
  expect(Number(val2)).toBe(30);

  // Restore
  await fillField(getFrame(page), 'Only check emails newer than', '30');
  await clickButton(getFrame(page), 'Save settings');
});

// ─── Section 20 · Free Plan Enforcement ──────────────────────────────────────

test('S20: home card shows Free plan indicator and Upgrade button', async ({ page }) => {
  const frame = await openAddon(page);
  await expect(frame.getByText(/Plan/i)).toBeVisible();
  await expect(frame.getByText(/Free \(/)).toBeVisible();
  await expect(frame.getByRole('button', { name: /Upgrade to Pro/i })).toBeVisible();
});

test('S20: polling interval is clamped to 30 min on Free plan', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await fillField(getFrame(page), 'Polling interval', '1');
  await clickButton(getFrame(page), 'Save settings');
  await expectToast(page, /raised to 30 min|Free plan minimum/i);
  await clickButton(getFrame(page), 'Settings');
  await expect(getFrame(page).getByLabel(/Polling interval/i)).toHaveValue('30');
});

test('S20: rule count limit blocks a 4th rule', async ({ page }) => {
  const frame = await openAddon(page);
  // Ensure exactly 3 rules exist by creating them
  for (let i = 1; i <= 3; i++) {
    await clickButton(getFrame(page), 'Rules');
    await clickButton(getFrame(page), '+ New rule');
    await fillField(getFrame(page), 'Rule name', `Free limit test ${i}`);
    await fillField(getFrame(page), 'Gmail labels', 'INBOX');
    await fillField(getFrame(page), 'Rule text', `Any email ${i}.`);
    await clickButton(getFrame(page), 'Save');
  }
  // 4th should fail
  await clickButton(getFrame(page), 'Rules');
  await clickButton(getFrame(page), '+ New rule');
  await fillField(getFrame(page), 'Rule name', 'Free limit test 4');
  await fillField(getFrame(page), 'Gmail labels', 'INBOX');
  await fillField(getFrame(page), 'Rule text', 'Should fail.');
  await clickButton(getFrame(page), 'Save');
  await expectToast(page, /Rule limit reached|Upgrade to Pro/i);
});

test('S20: rule editor hides Chat and MCP channels on Free', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Rules');
  await getFrame(page).getByText(/Free limit test 1/).click();
  await expect(getFrame(page).getByText(/Google Chat webhooks.*Pro plan only/i)).toBeVisible();
  await expect(getFrame(page).getByText(/MCP servers.*Pro plan only/i)).toBeVisible();
});

test('S20: AI Suggest buttons show (Pro) and return upgrade toast on Free', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Rules');
  await getFrame(page).getByText(/Free limit test 1/).click();
  await expect(getFrame(page).getByRole('button', { name: /Suggest rule text \(Pro\)/i })).toBeVisible();
  await clickButton(getFrame(page), 'Suggest rule text (Pro)');
  await expectToast(page, /Upgrade to Pro/i);
});
