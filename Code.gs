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
function actionShowActivity(e) { return universalCardResponse_(buildActivityCard()); }
function actionShowHelp(e)     { return universalCardResponse_(buildHelpCard()); }

/**
 * Universal action: run a mail check immediately. Useful for verifying a
 * brand new rule without waiting for the next time-driven trigger.
 */
function actionRunCheckNow(e) {
  try { runMailCheck(); }
  catch (err) { log('Manual check failed: ' + err); }
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
