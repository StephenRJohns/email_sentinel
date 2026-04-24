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
  // Gmail renders add-on icons with aria-label matching the add-on name
  const icon = page.locator('[aria-label*="emAIl Sentinel"]').first();
  await icon.waitFor({ timeout: 20_000 });
  await icon.click();
  return getFrame(page);
}

// Returns the add-on iframe frameLocator (re-fetched each call since cards reload the iframe)
function getFrame(page) {
  return page.frameLocator(ADDON_IFRAME).first();
}

// Wait for a Gmail toast notification containing text (toasts appear in the main page).
// text may be a plain string or a RegExp — both are handled correctly.
async function expectToast(page, text, timeout = 15_000) {
  let toast;
  if (text instanceof RegExp) {
    toast = page.locator('[role="alert"], [aria-live]').filter({ hasText: text }).first();
  } else {
    toast = page.locator(`[role="alert"]:has-text("${text}"), [aria-live]:has-text("${text}")`).first();
  }
  await expect(toast).toBeVisible({ timeout });
}

// Click a Card button by its visible label. Uses .first() because Gmail's
// card navigation stack can leave a previous card's buttons in the DOM
// alongside the current card's, producing duplicate matches.
async function clickButton(frame, label) {
  await frame.getByRole('button', { name: label }).first().click();
}

// Fill a text input identified by its label
async function fillField(frame, label, value) {
  const field = frame.getByLabel(label, { exact: false });
  await field.clear();
  await field.fill(value);
}

// Navigate using the add-on's nav buttons (Settings, Rules, etc.)
async function navTo(page, section) {
  const frame = getFrame(page);
  await clickButton(frame, section);
}

// Send a test email to the configured Gmail address
async function sendTestEmail(page, subject, email) {
  // Open compose in a new tab
  const composeBtn = page.locator('[gh="cm"]');
  await composeBtn.click();
  await page.locator('[name="to"]').fill(email);
  await page.locator('[name="subjectbox"]').fill(subject);
  await page.keyboard.press('Tab');
  await page.locator('[aria-label="Send"]').click();
  // Wait for send confirmation
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
