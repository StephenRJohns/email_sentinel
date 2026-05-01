// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * ScreenshotMode.gs — Substitutes safe demo PII in alert content and on
 * recipient-display surfaces so Marketplace screenshots don't leak real
 * names, phone numbers, or email addresses.
 *
 * Toggle via setScreenshotModeOn() / setScreenshotModeOff() from the Apps
 * Script editor's function dropdown. There is no UI control. Toggle state
 * persists in settings.screenshotMode.
 *
 * When ON, these substitutions apply:
 *   • emailData.from                              → 'Tester <test@example.com>'
 *   • SMS dispatch recipient                      → '+12105551212'
 *   • Settings/Rule editor SMS recipient name     → 'Tester'
 *   • Settings/Rule editor SMS recipient number   → '+12105551212'
 *   • Activity log "From: ... | Subject: ..."     → uses the override
 *   • emailData.subject and emailData.body        → user-defined PII
 *                                                   substring redactions
 *                                                   applied (see below)
 *
 * **Real developer PII (your name / phone / email) is never stored in source
 * code.** The body/subject redaction list lives in UserProperties (private
 * per-user) and is configured at runtime via setScreenshotRedaction(). The
 * demo values hardcoded in this file (`Tester`, `test@example.com`,
 * `+12105551212`) are fictional — `555-1212` is the standard demonstration
 * suffix in the North American Numbering Plan.
 */

// ── Demo values (safe to commit — fictional) ─────────────────────────────────

const SCREENSHOT_FROM_HEADER  = 'Tester <test@example.com>';
const SCREENSHOT_DISPLAY_NAME = 'Tester';
const SCREENSHOT_PHONE        = '+12105551212';

const SCREENSHOT_REDACTIONS_KEY = 'mailsentinel.screenshotRedactions';

// ── Mode toggle ──────────────────────────────────────────────────────────────

function isScreenshotMode_() {
  return !!loadSettings().screenshotMode;
}

function setScreenshotMode_(on) {
  const s = loadSettings();
  s.screenshotMode = !!on;
  saveSettings(s);
  activityLog('Screenshot mode: ' + (s.screenshotMode ? 'ON' : 'OFF'));
  return s.screenshotMode;
}

function setScreenshotModeOn()  { return setScreenshotMode_(true); }
function setScreenshotModeOff() { return setScreenshotMode_(false); }

// ── Body / subject redaction list (UserProperties; never in source code) ─────

function getScreenshotRedactions_() {
  const raw = PropertiesService.getUserProperties().getProperty(SCREENSHOT_REDACTIONS_KEY);
  try { return raw ? JSON.parse(raw) : []; }
  catch (e) { return []; }
}

/**
 * Add or update one redaction pair. Persists in UserProperties.
 *   real — substring to find in subject/body (case-sensitive)
 *   demo — substring to substitute in (use '' to delete)
 *
 * Calling this with the same `real` value replaces the existing entry.
 * Returns the new total count (does not echo the values back).
 */
function setScreenshotRedaction(real, demo) {
  if (!real) throw new Error('real value is required.');
  if (typeof demo !== 'string') throw new Error('demo value is required (use empty string to scrub completely).');
  const list = getScreenshotRedactions_().filter(function(p) { return p.real !== real; });
  list.push({ real: real, demo: demo });
  PropertiesService.getUserProperties().setProperty(
    SCREENSHOT_REDACTIONS_KEY, JSON.stringify(list)
  );
  activityLog('Screenshot redaction added (' + list.length + ' total).');
  return list.length;
}

function clearScreenshotRedactions() {
  PropertiesService.getUserProperties().deleteProperty(SCREENSHOT_REDACTIONS_KEY);
  activityLog('Screenshot redactions cleared.');
  return 0;
}

/**
 * Returns the redaction list as an in-memory array. Logs only the count to
 * the system Logger (never the values themselves) so the activity log and
 * Stackdriver logs stay PII-free.
 */
function listScreenshotRedactions() {
  const list = getScreenshotRedactions_();
  Logger.log(list.length + ' screenshot redaction(s) configured. (Values not logged.)');
  return list;
}

/**
 * Local-only setup stub. Add setScreenshotRedaction(real, demo) calls below
 * to populate your private redaction list, run this function once from the
 * Apps Script editor, then **revert this function body to empty before
 * committing**. Real values are persisted to UserProperties at runtime —
 * they never need to live in source code.
 */
function configureMyScreenshotRedactions() {
  // EDIT BELOW LOCALLY ONLY. DELETE ALL CALLS BEFORE COMMITTING.
}

// ── Scrub / overrides ────────────────────────────────────────────────────────

function scrubScreenshotPii_(text) {
  if (!isScreenshotMode_() || !text) return text;
  let result = String(text);
  getScreenshotRedactions_().forEach(function(pair) {
    if (pair.real) result = result.split(pair.real).join(pair.demo || '');
  });
  return result;
}

function applyScreenshotEmailData_(emailData) {
  if (!isScreenshotMode_()) return emailData;
  return Object.assign({}, emailData, {
    from:    SCREENSHOT_FROM_HEADER,
    subject: scrubScreenshotPii_(emailData.subject),
    body:    scrubScreenshotPii_(emailData.body)
  });
}

function applyScreenshotPhone_(phoneNumber) {
  return isScreenshotMode_() ? SCREENSHOT_PHONE : phoneNumber;
}

function applyScreenshotName_(name) {
  return isScreenshotMode_() ? SCREENSHOT_DISPLAY_NAME : name;
}
