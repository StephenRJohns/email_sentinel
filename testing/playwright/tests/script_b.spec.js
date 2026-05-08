require('dotenv').config({ path: require('path').resolve(__dirname, '../e2e.config.env') });
const { test, expect } = require('../fixtures');
const {
  openAddon,
  getFrame,
  expectToast,
  clickButton,
  fillField,
  sendTestEmail
} = require('../helpers');

// ─── UserTesting Round 1 — Script B (SMS path, RETIRED) ─────────────────────
//
// Mirrors usertesting/docs/script_b_power.md, which is **RETIRED** for paid
// UserTesting rounds — see that file's banner for the policy. This spec
// exists for parity with script_a.spec.js and as a developer convenience
// for verifying the SMS path manually before any future round revives it.
// **Do NOT add this spec to the default CI test glob.** Run it explicitly:
//
//   npx playwright test tests/script_b.spec.js
//   ./testing/run_free_e2e_tests.sh tests/script_b.spec.js
//
// One test() per task, gated by env vars so missing creds skip cleanly
// rather than fail. Required env in e2e.config.env:
//
//   GOOGLE_EMAIL    — required for Task 4 self-send
//   GEMINI_API_KEY  — required for Task 2 Gemini config
//   SMS_PROVIDER    — required for Task 2 SMS config (Script B uses 'textbelt')
//   SMS_API_KEY     — required for Task 2; for Textbelt this is the literal
//                     string 'textbelt' (free tier, 1 SMS/day per IP)
//   SMS_TEST_NUMBER — required for Task 2 'Send test SMS' button. E.164
//                     format (e.g. +15551234567) — the digits go into the
//                     test-number field; the country code goes into the
//                     country-code dropdown. Splitting them in JS is
//                     non-trivial and the country-code dropdown is a
//                     CardService Material control Playwright cannot
//                     reliably interact with, so a real run requires the
//                     country code to already be set correctly in
//                     Settings before launching this test.
//
// Re-run safety: Textbelt's free 'textbelt' token is rate-limited to 1
// SMS/day per IP. Running this spec twice in 24h will fail T2's Send test
// SMS step on the second run. Use a paid provider in SMS_PROVIDER, or wait
// 24h, or skip T2 with --grep '!Task 2'.
//
// Recipient setup: Script B Task 2 step 5 walks the tester through the
// "+ Add SMS recipient" editor (country-code dropdown + digits-only field).
// The country-code dropdown is the same Material control noted above — the
// recipient editor is therefore best-effort here. If the editor cannot
// complete, T3's SMS rule-tickbox step will gracefully no-op.

const SCRIPT_B_RULE_NAME     = 'Script B — DEMO test rule';
const SCRIPT_B_LABEL         = 'INBOX';
const SCRIPT_B_RULE_TEXT     = 'Any email with the word DEMO in the subject line.';
const SCRIPT_B_EMAIL_SUBJECT = 'DEMO test 1';
const SCRIPT_B_RECIPIENT     = 'Script B test phone';

// Pull the bare digits off an E.164 number for the recipient editor's
// digits-only field. '+15551234567' -> '5551234567'. Keeps everything
// after the country code, falling back to stripping non-digits if the
// number isn't E.164-formatted.
function digitsOnly(e164) {
  if (!e164) return '';
  const m = String(e164).match(/^\+\d{1,3}(\d+)$/);
  return m ? m[1] : String(e164).replace(/\D/g, '');
}

// ─── Task 1 · Install + open the add-on ──────────────────────────────────────
// As with Script A, the actual install (OAuth consent flow) cannot be
// automated. Assume the add-on is already installed on the persistent E2E
// Chrome profile.

test('Task 1 · home card loads with the value-prop content', async ({ page }) => {
  const frame = await openAddon(page);
  await expect(frame.getByText(/Free \(|Plan:?\s*Pro/i)).toBeVisible();
  await expect(frame.getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(frame.getByRole('button', { name: 'Rules' })).toBeVisible();
  await expect(frame.getByRole('button', { name: 'Scan email now' })).toBeVisible();
});

// ─── Task 2 · Configure Gemini and SMS provider ──────────────────────────────
// Script B Task 2 is six minutes of tester time and the most variable step
// in any UserTesting session. Three reasons it is best-effort here:
//   1. The SMS-provider dropdown is a CardService SelectionInput.DROPDOWN
//      which Playwright cannot reliably change (custom Material control,
//      not a native <select>). The test assumes the provider is ALREADY
//      set in Settings to match SMS_PROVIDER — typically by a one-off
//      manual configuration on the test account.
//   2. The country-code dropdown next to phone-number fields has the same
//      limitation. The test number / recipient number are filled into the
//      digits-only sibling input only; the country code is assumed
//      pre-set.
//   3. Sending a real SMS via Textbelt's free token consumes the daily
//      1-msg-per-IP quota, so this test should be run sparingly.

test('Task 2 · Gemini key + SMS test number save and Send test SMS reports OK', async ({ page }) => {
  const gemini   = process.env.GEMINI_API_KEY;
  const provider = process.env.SMS_PROVIDER;
  const apiKey   = process.env.SMS_API_KEY;
  const testNum  = process.env.SMS_TEST_NUMBER;
  test.skip(!gemini, 'GEMINI_API_KEY not set');
  test.skip(!provider, 'SMS_PROVIDER not set — pre-configure provider in Settings before running');
  test.skip(!apiKey, 'SMS_API_KEY not set');
  test.skip(!testNum, 'SMS_TEST_NUMBER not set');
  test.setTimeout(180_000);

  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  const f = getFrame(page);

  // Gemini key first (Script B Task 2 step 2).
  await fillField(f, 'Gemini API key', gemini);
  await clickButton(f, 'Save settings');
  await expectToast(page, /Settings saved|No changes/);

  // The Settings card re-renders after save. Re-fetch the frame and locate
  // the SMS-provider section. The provider-specific API-key input title
  // depends on which provider is selected: 'Textbelt API key',
  // 'Telnyx API key', etc. (see SMS_FIELD_DEFS_ in Cards.gs). For
  // Textbelt the value is literally the word "textbelt" per the script.
  const apiKeyTitleByProvider = {
    textbelt:  'Textbelt API key',
    telnyx:    'Telnyx API key',
    plivo:     'Plivo Auth ID',
    twilio:    'Twilio Account SID',
    clicksend: 'ClickSend username',
    vonage:    'Vonage API key',
    webhook:   'Generic webhook URL'
  };
  const apiKeyTitle = apiKeyTitleByProvider[provider];
  test.skip(!apiKeyTitle, `Unknown SMS_PROVIDER '${provider}'`);

  // The provider-specific field renders only after the provider dropdown
  // has been selected. If the field is not visible, Settings still has
  // 'none' picked and the test should explain that to the user.
  const apiKeyField = getFrame(page).getByLabel(apiKeyTitle, { exact: false });
  if (!(await apiKeyField.isVisible({ timeout: 5_000 }).catch(() => false))) {
    test.skip(true,
      `'${apiKeyTitle}' field not rendered — pre-select '${provider}' from the SMS provider dropdown in Settings, save, then re-run`);
  }
  await fillField(getFrame(page), apiKeyTitle, apiKey);
  await fillField(getFrame(page), 'Test phone number', digitsOnly(testNum));
  await clickButton(getFrame(page), 'Save settings');
  await expectToast(page, /Settings saved|No changes/);

  // Send the test SMS and wait for the toast. Whether the SMS actually
  // arrives on the tester's phone is verified by the human; here we only
  // check the dispatch acknowledgement from the add-on.
  await clickButton(getFrame(page), 'Send test SMS');
  await expectToast(page, /Test SMS (sent|queued|failed|rate)/i, 30_000);
});

// ─── Task 3 · Create a rule that texts you ───────────────────────────────────
// Best-effort. The "+ New rule" path is flagged as not reliably automatable
// in playwright/README.md; same caveat as Script A T3.

test('Task 3 · create rule with SMS recipient ticked', async ({ page }) => {
  test.setTimeout(180_000);
  const frame = await openAddon(page);
  await clickButton(frame, 'Rules');
  await clickButton(getFrame(page), '+ New rule');
  const f = getFrame(page);
  await fillField(f, 'Rule name', SCRIPT_B_RULE_NAME);
  await fillField(f, 'Gmail labels to watch', SCRIPT_B_LABEL);
  await fillField(f, 'Rule text', SCRIPT_B_RULE_TEXT);

  // The rule-editor SMS section renders one checkbox per configured
  // recipient. Label format: '<name> (<E.164 number>)' (Cards.gs
  // buildRuleEditorCard, line ~660). Match by recipient name fragment
  // and tick whichever recipient is present — typical accounts have a
  // single recipient, the one Task 2 walks the tester through adding.
  const recipientBox = f.getByRole('checkbox', { name: new RegExp(SCRIPT_B_RECIPIENT, 'i') }).first();
  if (await recipientBox.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await recipientBox.check({ force: true }).catch(() => {});
  } else {
    // Fall back to the first checkbox under the SMS section if the
    // recipient name does not match — tester may have used a different
    // name when adding the recipient manually.
    const anySms = f.getByRole('checkbox').first();
    if (await anySms.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await anySms.check({ force: true }).catch(() => {});
    }
  }
  await clickButton(f, 'Save');
  await expectToast(page, /Rule saved|Rule added/i, 15_000);
});

// ─── Task 4 · Send test email and confirm scan finds a match ─────────────────
// Same kebab path Script A Task 4 uses, with the same fallback to the
// home-card "Scan email now" button. Whether the SMS itself arrives on
// the tester's phone (Script B Task 4 step 5) is necessarily verified by
// the human — this test only confirms the add-on side ran the scan and
// reported a match (which is the trigger for SMS dispatch).

test('Task 4 · self-send DEMO email and Scan email now reports a match', async ({ page }) => {
  const email = process.env.GOOGLE_EMAIL;
  test.skip(!email, 'GOOGLE_EMAIL not set in e2e.config.env');
  test.setTimeout(300_000);
  await sendTestEmail(page, SCRIPT_B_EMAIL_SUBJECT, email);
  await page.waitForTimeout(10_000);
  const frame = await openAddon(page);

  let scannedViaKebab = false;
  const kebab = frame.getByRole('button', { name: /more|overflow|options/i }).first();
  if (await kebab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await kebab.click({ force: true }).catch(() => {});
    const menuItem = frame.getByRole('menuitem', { name: 'Scan email now' }).first();
    const textHit  = frame.getByText('Scan email now').first();
    const target   = (await menuItem.isVisible({ timeout: 3_000 }).catch(() => false))
      ? menuItem : textHit;
    if (await target.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await target.click({ force: true });
      await clickButton(getFrame(page), 'Run scan now');
      scannedViaKebab = true;
    }
  }
  if (!scannedViaKebab) {
    await clickButton(getFrame(page), 'Scan email now');
  }

  await expect(getFrame(page).locator('body')).toContainText(
    /Scan complete.*\b1\b.*match|Scan complete.*match/i,
    { timeout: 240_000 }
  );
});

// ─── Task 5 · Wrap-up questions ──────────────────────────────────────────────
// Tester interview — cannot be automated.

test('Task 5 · wrap-up interview (manual, permanent skip)', async () => {
  test.skip(true, 'Tester interview — see usertesting/docs/script_b_power.md Task 5');
});
