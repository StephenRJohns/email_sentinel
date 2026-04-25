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

function actionShowRules(e)    { return universalCardResponse_(buildRulesCard()); }
function actionShowSettings(e) { return universalCardResponse_(buildSettingsCard()); }
function actionShowActivity(e) { return universalCardResponse_(buildActivityCard(0)); }
function actionShowHelp(e)     { return universalCardResponse_(buildHelpCard()); }

/**
 * Universal action: run a mail check immediately. Useful for verifying a
 * brand new rule without waiting for the next time-driven trigger.
 */
function actionRunCheckNow(e) {
  try {
    var result = runMailCheck() || {};
    activityLog('Manual check: ' + (result.messagesChecked || 0) + ' new email(s), ' +
      (result.matchesFound || 0) + ' match(es).');
  } catch (err) {
    activityLog('Manual check failed: ' + err);
  }
  return universalCardResponse_(buildActivityCard());
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

// ── Testing helpers (run manually from the Apps Script editor) ────────────────

// Resets all add-on state for this user to pristine first-use condition.
// Run this before each E2E test suite run so S2 starts from a clean slate.
function resetUserPropertiesForTesting() {
  PropertiesService.getUserProperties().deleteAllProperties();
  Logger.log('All user properties cleared — add-on is in pristine first-use state.');
}
