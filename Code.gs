// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * Code.gs — Add-on entry points (homepage triggers and universal actions).
 *
 * Each function here is referenced from appsscript.json and must therefore
 * keep its name stable. They all delegate to Cards.gs builders.
 *
 * - homepageTrigger functions return a Card.
 * - universalAction functions return a UniversalActionResponse.
 */

function onHomepage(e) {
  return buildHomeCard();
}

function actionShowHome(e)     { return universalCardResponse_(buildHomeCard()); }
function actionShowRules(e)    { return universalCardResponse_(buildRulesCard()); }
function actionShowSettings(e) { return universalCardResponse_(buildSettingsCard()); }
function actionShowActivity(e) { return universalCardResponse_(buildActivityCard(0)); }
function actionShowHelp(e)     { return universalCardResponse_(buildHelpCard()); }

function actionRunCheckNow(e) {
  return universalCardResponse_(buildPreScanCard_());
}

// Opens the GitHub Discussions page for the project in a new tab.
// UniversalActionResponseBuilder.setOpenLink is the supported way for a
// kebab-menu universal action to navigate to an external URL directly
// (no card push, no displayAddOnCards). The github.com/ prefix is already
// whitelisted in appsscript.json openLinkUrlPrefixes.
const DISCUSSIONS_URL = 'https://github.com/StephenRJohns/email_sentinel/discussions';

function actionOpenDiscussions(e) {
  return CardService.newUniversalActionResponseBuilder()
    .setOpenLink(CardService.newOpenLink()
      .setUrl(DISCUSSIONS_URL)
      .setOpenAs(CardService.OpenAs.FULL_SIZE))
    .build();
}

function universalCardResponse_(card) {
  return CardService.newUniversalActionResponseBuilder()
    .displayAddOnCards([card])
    .build();
}

function onUninstall(e) {
  removeTriggers();
}

function notificationResponse_(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(text))
    .build();
}

function plural_(n, singular, opt_plural) {
  return n + ' ' + (n === 1 ? singular : (opt_plural || singular + 's'));
}

/**
 * Returns the IANA timezone ID to use for user-facing dates in alerts.
 * Prefers the user's primary Calendar timezone (matches what Gmail and
 * Calendar display in the UI); falls back to the script-project timezone
 * declared in appsscript.json if the calendar lookup fails. Without this,
 * Date.toISOString() emits Zulu / UTC, which surfaces in spreadsheet rows
 * and alert text as `2026-04-27T22:29:58.636Z` — confusing for users in
 * non-UTC zones.
 *
 * Cached in a module-level variable so a single trigger run that writes
 * dozens of activity-log entries doesn't pay the CalendarApp round-trip
 * per entry. Apps Script preserves module state for the duration of one
 * execution, which is exactly the scope we want.
 */
var _cachedUserTz_ = null;
function getUserTimeZone_() {
  if (_cachedUserTz_) return _cachedUserTz_;
  try {
    const cal = CalendarApp.getDefaultCalendar();
    if (cal) {
      _cachedUserTz_ = cal.getTimeZone();
      return _cachedUserTz_;
    }
  } catch (e) { /* fall through to script TZ */ }
  _cachedUserTz_ = Session.getScriptTimeZone();
  return _cachedUserTz_;
}

/**
 * Format a Date (or anything `new Date()` accepts) as a human-readable
 * local-timezone string for alert dispatch.
 *
 *   formatLocalDateTime_(new Date())
 *     → "2026-04-27 5:29:58 PM CDT"
 *
 * Sortable lexically (the leading yyyy-MM-dd prefix sorts chronologically),
 * and the trailing TZ abbreviation makes the timezone unambiguous to the
 * recipient. Returns '' for falsy or unparseable inputs.
 */
function formatLocalDateTime_(dateLike) {
  if (!dateLike) return '';
  const d = (dateLike instanceof Date) ? dateLike : new Date(dateLike);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, getUserTimeZone_(), 'yyyy-MM-dd h:mm:ss a z');
}

// ── Testing helpers (run manually from the Apps Script editor) ────────────────

// Resets all add-on state for this user to pristine first-use condition.
// Run this before each E2E test suite run so S2 starts from a clean slate.
function resetUserPropertiesForTesting() {
  PropertiesService.getUserProperties().deleteAllProperties();
  Logger.log('All user properties cleared — add-on is in pristine first-use state.');
}
