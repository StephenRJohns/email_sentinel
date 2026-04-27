const { expect } = require('@playwright/test');

const GMAIL_URL = 'https://mail.google.com';

// Gmail add-on iframes are served from addons.gsuite.google.com.
// (Google moved the host from script.googleusercontent.com to this domain
// at some point — the diagnostic script confirms all the add-on buttons
// live inside this frame.)
const ADDON_IFRAME = 'iframe[src*="addons.gsuite.google.com"]';

// The add-on icon in Gmail's right-hand sidebar rail
async function openAddon(page) {
  await page.goto(GMAIL_URL, { waitUntil: 'domcontentloaded' });
  // Wait for Gmail's main content to render before the add-on rail initializes.
  // On the first load of a fresh Chrome profile this can take 30-60 seconds.
  await page.waitForSelector('[role="main"]', { timeout: 60_000 }).catch(() => {});
  // The add-on tab carries aria-label="emAIl Sentinel". In narrow Gmail layouts
  // it can be CSS-hidden (aria-hidden="true" + the aT5-aOt-I collapsed class),
  // so we wait only for DOM attachment and force-click to bypass visibility.
  const icon = page.locator('[aria-label*="emAIl Sentinel"]').first();
  await icon.waitFor({ state: 'attached', timeout: 45_000 });
  await icon.click({ force: true });
  return getFrame(page);
}

// Returns the add-on iframe frameLocator (re-fetched each call since cards reload the iframe)
function getFrame(page) {
  return page.frameLocator(ADDON_IFRAME).first();
}

// Wait for a Gmail toast notification containing text.
// Gmail add-on notifications appear inside the add-on iframe without standard
// ARIA roles, so .or() with a FrameLocator is not allowed. We poll both the
// main page (ARIA elements) and the iframe (any div/span) every 300ms.
// text may be a plain string or a RegExp — both are handled correctly.
async function expectToast(page, text, timeout = 15_000) {
  const frame = getFrame(page);
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    // Main page: standard ARIA notification elements
    const mainVisible = text instanceof RegExp
      ? await page.locator('[role="alert"], [aria-live]').filter({ hasText: text }).first().isVisible().catch(() => false)
      : await page.locator(`[role="alert"]:has-text("${text}"), [aria-live]:has-text("${text}")`).first().isVisible().catch(() => false);
    if (mainVisible) return;

    // Add-on iframe: any div or span containing the notification text
    const iframeVisible = await frame.locator('div, span').filter({ hasText: text }).first().isVisible().catch(() => false);
    if (iframeVisible) return;

    await page.waitForTimeout(300);
  }

  throw new Error(`Toast not found after ${timeout}ms: ${text instanceof RegExp ? text : `"${text}"`}`);
}

// Click a Card button by its visible label. Uses .first() because Gmail's
// card navigation stack can leave a previous card's buttons in the DOM
// alongside the current card's, producing duplicate matches.
// force: true bypasses the ge6pde-uMX1Ee-bBybbf loading overlay that
// intercepts pointer events between card transitions.
async function clickButton(frame, label) {
  await frame.getByRole('button', { name: label }).first().click({ force: true, timeout: 30_000 });
}

// Fill a text input identified by its label.
// Pressing Tab after fill blurs the field, which forces the Apps Script card
// framework to commit the new value to its form model before the next button
// click reads it. Without this, force-clicked Save buttons can submit a stale
// form snapshot ("No changes to save") instead of the value just typed.
// The 500ms in-page wait gives the framework's debounced state sync time to
// flush before the next click — without it, fill+Tab+click races and ~10% of
// the time the click reads pre-blur form state.
async function fillField(frame, label, value) {
  const field = frame.getByLabel(label, { exact: false });
  await field.clear();
  await field.fill(value);
  await field.press('Tab');
  await field.evaluate(() => new Promise(r => setTimeout(r, 500)));
}

// Navigate using the add-on's nav buttons (Settings, Rules, etc.)
async function navTo(page, section) {
  const frame = getFrame(page);
  await clickButton(frame, section);
}

// Send a test email to the configured Gmail address
async function sendTestEmail(page, subject, email) {
  // Wait for Gmail's inbox to fully render before looking for compose
  await page.waitForSelector('[role="main"]', { timeout: 60_000 }).catch(() => {});
  // Modern Gmail renders Compose as <div role="button">Compose</div> with class
  // .T-I.T-I-KE.L3 (no gh="cm", no aria-label). Use the role+name accessor as
  // primary; fall back to legacy/class-based selectors if Gmail redesigns again.
  const composeBtn = page.getByRole('button', { name: 'Compose' })
    .or(page.locator('.T-I-KE'))
    .or(page.locator('[gh="cm"]'))
    .first();
  await composeBtn.waitFor({ timeout: 30_000 });
  await composeBtn.click();
  // Modern Gmail "To" field is a contenteditable <div role="combobox">, not an
  // <input>, so .fill() throws. Click to focus, then use keyboard.type.
  const toField = page.locator('[aria-label="To"], [name="to"]').first();
  await toField.waitFor({ timeout: 15_000 });
  await toField.click();
  await page.keyboard.type(email);
  await page.keyboard.press('Tab');
  // Subject is still a regular <input>
  await page.locator('[name="subjectbox"]').first().click();
  await page.keyboard.type(subject);
  await page.keyboard.press('Tab');
  // Use Ctrl+Enter — Gmail's universal Send shortcut. More reliable than
  // [aria-label^="Send"] which can match "Send feedback to Google" menu items.
  await page.keyboard.press('Control+Enter');
  await page.locator('text=Message sent').waitFor({ timeout: 15_000 }).catch(() => {});
}

// Wait for the test email to arrive in the inbox
async function waitForEmailInInbox(page, subject, retries = 6) {
  for (let i = 0; i < retries; i++) {
    await page.goto(`${GMAIL_URL}/#search/subject:${encodeURIComponent(subject)}`, { waitUntil: 'domcontentloaded' });
    const row = page.locator(`[data-legacy-thread-id], tr`).filter({ hasText: subject }).first();
    if (await row.isVisible().catch(() => false)) return;
    await page.waitForTimeout(5_000);
  }
  throw new Error(`Timed out waiting for email with subject: ${subject}`);
}

module.exports = { GMAIL_URL, openAddon, getFrame, expectToast, clickButton, fillField, navTo, sendTestEmail, waitForEmailInInbox };
