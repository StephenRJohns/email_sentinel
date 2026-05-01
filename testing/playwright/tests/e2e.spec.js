require('dotenv').config({ path: require('path').resolve(__dirname, '../e2e.config.env') });
const { test, expect } = require('../fixtures');
const { openAddon, getFrame, expectToast, clickButton, fillField } = require('../helpers');

// ─── Pre-run requirements (manual, not automated) ────────────────────────────
//
// Before running this suite:
//   1. The add-on must be installed and signed in to the test account.
//   2. Gemini API key configured in Settings (only needed for tests that
//      verify post-save state — most automated checks don't require it).
//   3. Run resetUserPropertiesForTesting() in Apps Script editor for a
//      fully pristine run if rule state has accumulated from prior runs.
//
// This automated suite covers the reliably passing tests only. Tests that
// depend on:
//   - Real email send + delivery (S6+S7)
//   - Specific tier flips that the suite cannot enforce (S2 Pro grid, S21)
//   - Time-driven trigger state (S15/S16 monitoring)
//   - Multi-step modal workflows that flake (S17 confirmations)
//   - Rule creation + cleanup state (S4, S20 rule-editor checks)
// remain manual per testing/e2e_test_plan.md.

// ─── S2 · Home card and Settings navigation ───────────────────────────────────

test('S2: home card loads with all status rows', async ({ page }) => {
  const frame = await openAddon(page);
  // Distinctive home-card identifiers — avoid ambiguous text like "Monitoring"
  // or "Rules" that also appears in nav buttons (and is hidden there).
  // .first() on "Gemini API key" disambiguates from the Quick-setup checklist
  // line "✓ Paste your Gemini API key".
  await expect(frame.getByText(/Free \(|Plan:?\s*Pro/i)).toBeVisible();
  await expect(frame.getByText('Gemini API key').first()).toBeVisible();
});

test('S2: Settings card opens', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await expect(getFrame(page).getByText('Gemini (rule evaluation)')).toBeVisible();
});

// ─── S2 · Polling field ──────────────────────────────────────────────────────
// The polling input is a dropdown of whole-hour options at or above the
// active tier's minimum. The previous edge-case tests (clamp below tier min,
// round up non-multiple-of-60, invalid string input) are no longer reachable
// from the UI because the dropdown only offers valid values; they remain
// covered by enforcePollFloor unit-style logic in LicenseManager.gs and by
// manual invocation. The surviving automated coverage is just "the dropdown
// exists and the max-age field renders."

test('S2: polling and max-age fields visible in Settings', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  const f = getFrame(page);
  // Polling is now a dropdown — check by visible label/title rather than
  // getByLabel which targets text inputs.
  await expect(f.getByText('Scan email every').first()).toBeVisible();
  await expect(f.getByLabel('Only check emails newer than', { exact: false })).toBeVisible();
});

// ─── S3 · Starter Rules ───────────────────────────────────────────────────────

test('S3: starter rules preview opens and lists creatable starter rules', async ({ page }) => {
  // The preview card filters out starter rules whose name already exists in
  // the user's rules list (Cards.gs buildStarterRulesCard). On a non-pristine
  // test account, only the not-yet-created subset is visible — assert that the
  // card opened with at least one starter-rule entry rather than enumerating
  // all five (which would require resetUserPropertiesForTesting before run).
  const frame = await openAddon(page);
  await clickButton(frame, 'Starter rules');
  const f = getFrame(page);
  // Either the "rules will be created" header is visible, or the
  // "All starter rules already exist." message is visible.
  await expect(
    f.getByText(/rules will be created \(disabled\)|All starter rules already exist/i)
  ).toBeVisible({ timeout: 30_000 });
  // At least one of the five canonical starter-rule names should appear when
  // the card is in the "rules will be created" state. Skip the click+toast
  // step entirely if the user has every starter rule already.
  const allExist = await f.getByText(/All starter rules already exist/i).isVisible();
  if (allExist) return;
  const canonicalNames = [
    'Urgent emails',
    'Invoices & payment requests',
    'Shipping & delivery updates',
    'Security & account alerts',
    'Bills & subscription renewals'
  ];
  let anyVisible = false;
  for (const name of canonicalNames) {
    if (await f.getByText(name).isVisible().catch(() => false)) { anyVisible = true; break; }
  }
  expect(anyVisible).toBe(true);
  await clickButton(f, 'Create starter rules');
  // Toast confirms creation OR reports the limit-skip outcome.
  await expectToast(page, /starter rules created|limit reached/i);
});

// ─── S5 · Run Check Now ───────────────────────────────────────────────────────

test('S5: scan email now produces a result toast', async ({ page }) => {
  // The default 120s per-test timeout is too tight: handleRunCheckNow is
  // synchronous and can take 30-90s when Gemini is in the loop. The
  // post-action toast lands as transient text inside the iframe body — once
  // toContainText sees "Check complete: ..." (or "Check failed: ...") it
  // returns; we don't need it to persist. The Activity-log navigation step
  // that used to follow this assertion was dropped because a second click
  // queued behind the still-pending scan never advanced the card; the toast
  // alone is sufficient end-to-end evidence the button wiring works. The
  // Activity-log content path remains in the manual e2e_test_plan.md.
  test.setTimeout(240_000);
  const frame = await openAddon(page);
  await clickButton(frame, 'Scan email now');
  await expect(getFrame(page).locator('body')).toContainText(
    /Check (complete|failed)/i,
    { timeout: 180_000 }
  );
});

// ─── S8 · Activity Log UI ────────────────────────────────────────────────────

test('S8: activity log has Refresh button', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Activity log');
  await expect(getFrame(page).getByRole('button', { name: 'Refresh' })).toBeVisible();
});

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
  await expect(getFrame(page).getByText(/emAIl Sentinel.*product of JJJJJ Enterprises/i)).toBeVisible();
});

test('S14: Settings & troubleshooting topic shows GitHub Issues link', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Help');
  await clickButton(getFrame(page), 'Settings & troubleshooting');
  await expect(getFrame(page).getByText('Open a GitHub issue')).toBeVisible();
});

test('S14: help search finds a known phrase across topics', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Help');
  // The "Search help" input + button live in their own section at the top.
  await fillField(getFrame(page), 'Search all topics', 'Reset baseline');
  await clickButton(getFrame(page), 'Search');
  // Results card uses the query in its header.
  await expect(getFrame(page).getByText(/Search:\s*"Reset baseline"/i)).toBeVisible();
  // The Settings & troubleshooting topic mentions Reset baseline, so it should
  // appear as a result. Apps Script keeps the previous Help card in the DOM
  // (hidden) — a bare getByText match resolves to many nodes including hidden
  // ones. The "Open: <topic>" button label is unique to the results card and
  // is only rendered for matched topics, so anchor on it.
  await expect(getFrame(page).getByRole('button', { name: /^Open:\s*Settings & troubleshooting$/i })).toBeVisible();
});

test('S14: help search empty query shows toast prompt', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Help');
  // Click Search without typing anything.
  await clickButton(getFrame(page), 'Search');
  await expectToast(page, 'Enter a search term first');
});

// ─── S17b · Unsaved-Changes Notice on Editor Cards ──────────────────────────
// CardService gives no event for the system back arrow, so editor cards cannot
// prompt to save unsaved changes. Each editor card prepends an amber notice as
// its first section. The Settings card is the most reliably reachable editor
// from automation; the rule editor / MCP / SMS recipient / Chat space editors
// are covered manually in the test plan because of the FILLED-button rendering
// issue noted in playwright/README.md.

test('S17b: unsaved-changes notice present on Settings card', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await expect(getFrame(page).getByText(/before tapping the back arrow/i)).toBeVisible();
});

// ─── S18 · Business Hours ────────────────────────────────────────────────────

test('S18: business hours checkbox is present in Settings', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await expect(getFrame(page).getByText('Only check during business hours')).toBeVisible();
});

// ─── S19 · Max Email Age ─────────────────────────────────────────────────────
// Full flow (baseline count comparison) remains manual. These tests cover
// field persistence and input validation.

test('S19: max email age persists a valid value', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await fillField(getFrame(page), 'Only check emails newer than', '1');
  await clickButton(getFrame(page), 'Save settings');
  await expectToast(page, /Settings saved|No changes/);
  const val = await getFrame(page).getByLabel('Only check emails newer than', { exact: false }).inputValue();
  expect(val).toBe('1');
});

test('S19: max email age 0 is clamped to minimum of 1', async ({ page }) => {
  // Set to 7 first so that 0→1 is a real state change (avoids "No changes to save").
  let frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await fillField(getFrame(page), 'Only check emails newer than', '7');
  await clickButton(getFrame(page), 'Save settings');
  await expectToast(page, /Settings saved|No changes/);
  // Navigate away to clear the toast, then test the clamp.
  frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await fillField(getFrame(page), 'Only check emails newer than', '0');
  await clickButton(getFrame(page), 'Save settings');
  await expectToast(page, 'Settings saved');
  const val = await getFrame(page).getByLabel('Only check emails newer than', { exact: false }).inputValue();
  expect(val).toBe('1');
});

test('S19: non-numeric max email age falls back to 30', async ({ page }) => {
  const frame = await openAddon(page);
  await clickButton(frame, 'Settings');
  await fillField(getFrame(page), 'Only check emails newer than', 'abc');
  await clickButton(getFrame(page), 'Save settings');
  await expectToast(page, 'Settings saved');
  const val = await getFrame(page).getByLabel('Only check emails newer than', { exact: false }).inputValue();
  expect(val).toBe('30');
});

// ─── S20 · Free Plan Visibility ──────────────────────────────────────────────
// Only the home-card visibility checks are automated. Rule-editor Pro-gating
// checks (Chat/MCP labels, AI Suggest suffix) remain manual — they require a
// "+ New rule" click that the Apps Script FILLED-button rendering doesn't
// expose to Playwright reliably.

test('S20: home card shows Free plan indicator and Upgrade button', async ({ page }) => {
  test.skip(process.env.TEST_TIER === 'pro', 'Free-tier-only — Pro hides the Free indicator and Upgrade button.');
  const frame = await openAddon(page);
  await expect(frame.getByText(/Free \(/)).toBeVisible();
  await expect(frame.getByRole('button', { name: /Upgrade to Pro/i })).toBeVisible();
});

test('S20: founding-member scarcity counter appears on home card', async ({ page }) => {
  test.skip(process.env.TEST_TIER === 'pro', 'Free-tier-only — the founding-member counter only renders for Free users.');
  const frame = await openAddon(page);
  await expect(frame.getByText(/Founding-member lifetime.*\$79/)).toBeVisible();
  await expect(frame.getByText(/of 500 remaining/i)).toBeVisible();
});
