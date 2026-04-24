// ─────────────────────────────────────────────────────────────────────────────
// FoundingMemberMonitor.gs
//
// DEV TOOL — runs in YOUR personal Apps Script project. Do NOT bundle this
// with the emAIl Sentinel end-user add-on.
//
// Purpose: watch the "first 500 founding-member lifetime" sales count and
// alert you when it approaches the limit so you have time to pause the SKU
// in the Google Cloud Console before you overshoot.
//
// Why manual vs. automatic: Google Workspace Marketplace does NOT currently
// expose a public API that returns "total active subscribers for SKU X".
// Developers read this from the Cloud Console dashboard. Until Google ships
// such an API, this script polls whichever source you tell it to (a number
// you paste in, or a Google Sheet you keep updated).
//
// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS — follow these in order:
// ─────────────────────────────────────────────────────────────────────────────
//
//   1. Go to https://script.google.com and click "New project".
//   2. Name it something like "emAIl Sentinel — founding-member monitor".
//   3. Delete the default Code.gs content.
//   4. Paste THIS ENTIRE FILE into Code.gs and save.
//
//   5. Decide how you want to track sales count:
//
//      OPTION A — Manual (simplest, good for ≤500 total sales):
//        a. Keep a browser tab open to:
//             Cloud Console → Google Workspace Marketplace SDK →
//             App configuration → Subscription Insights
//           (that's where Google shows you lifetime-SKU sales).
//        b. After each batch of sales you notice, edit MANUAL_COUNT below
//           to match and save the Apps Script file.
//        c. Set COUNT_SOURCE = 'manual' (already the default).
//
//      OPTION B — Google Sheet (better if you have a VA or log sales
//        anywhere else):
//        a. Create a Google Sheet, put the total sold count in cell A1.
//        b. Copy the Sheet ID from the URL and paste into COUNT_SHEET_ID
//           below.
//        c. Set COUNT_SOURCE = 'sheet'.
//
//   6. Set up an alert channel so you actually SEE the warning:
//        a. Create a Google Chat space (DM with yourself works fine).
//        b. In that space → click the space name → Apps & integrations →
//           Webhooks → Add webhook → give it a name → copy the URL.
//        c. Paste the URL into ALERT_CHAT_WEBHOOK below.
//        (If you don't have a paid Workspace account, skip this — alerts
//         will fall back to Apps Script execution logs, which you'll need
//         to check manually.)
//
//   7. Save the file.
//
//   8. In the Apps Script editor, select the function "installDailyTrigger"
//      from the function dropdown at the top, then click Run. Approve the
//      permission prompt. This schedules checkFoundingMemberQuota() to run
//      once per day around 9 AM.
//
//   9. (Recommended) Run "checkFoundingMemberQuota" once manually to confirm
//      it works — you should either see "OK:" in the logs (Executions tab)
//      or get an alert in Chat depending on the count.
//
//  10. From now on, just keep MANUAL_COUNT (or your Sheet) accurate. The
//      script does the rest.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT YOU DO WHEN IT ALERTS:
// ─────────────────────────────────────────────────────────────────────────────
//
//   When you get an "APPROACHING LIMIT" alert (sold >= 470):
//     1. Open Cloud Console → Workspace Marketplace SDK → App configuration.
//     2. Find the Founding-member lifetime SKU.
//     3. Do NOT pause it yet — just prepare.
//     4. Update `FOUNDING_MEMBERS_SOLD` in the main repo's LicenseManager.gs
//        to the latest count so the in-app "N of 500 remaining" counter
//        stays accurate.
//
//   When you get a "LIMIT REACHED" alert (sold >= 500):
//     1. Open Cloud Console → Workspace Marketplace SDK → App configuration.
//     2. Set the Founding-member lifetime SKU status to Disabled / Pause.
//     3. Update FOUNDING_MEMBERS_SOLD in LicenseManager.gs to the final
//        count and push — the UI stops advertising the offer automatically.
//     4. Honor or refund any buyers who squeaked in at #501+ per TERMS §6.6.
//
// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — edit these values for your setup:
// ─────────────────────────────────────────────────────────────────────────────

/** Absolute maximum founding-member sales. */
const LIMIT = 500;

/** Send an "approaching limit" alert when sold count reaches this number. */
const ALERT_AT = 470;

/** 'manual' | 'sheet' | 'api' */
const COUNT_SOURCE = 'manual';

/** Used when COUNT_SOURCE === 'manual'. Bump this as sales happen. */
const MANUAL_COUNT = 0;

/** Used when COUNT_SOURCE === 'sheet'. Count lives in cell A1 of the first sheet. */
const COUNT_SHEET_ID = '';

/** Google Chat incoming-webhook URL. Leave blank to fall back to log-only. */
const ALERT_CHAT_WEBHOOK = '';


// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONS — you shouldn't need to edit below this line:
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Daily check. Triggered automatically once installDailyTrigger() has been run.
 */
function checkFoundingMemberQuota() {
  const sold = getSoldCount_();

  if (sold >= LIMIT) {
    alert_('LIMIT REACHED: ' + sold + '/' + LIMIT + ' sold. ' +
           'Pause the SKU in Cloud Console now if you have not already. ' +
           'Update FOUNDING_MEMBERS_SOLD in LicenseManager.gs.');
    return;
  }

  if (sold >= ALERT_AT) {
    const remaining = LIMIT - sold;
    alert_('APPROACHING LIMIT: ' + sold + '/' + LIMIT + ' sold (' +
           remaining + ' remaining). Start preparing to pause the SKU.');
    return;
  }

  Logger.log('OK: ' + sold + '/' + LIMIT + ' sold — below alert threshold.');
}

/**
 * Returns the current sold count based on COUNT_SOURCE.
 */
function getSoldCount_() {
  switch (COUNT_SOURCE) {
    case 'sheet': {
      if (!COUNT_SHEET_ID) throw new Error('Set COUNT_SHEET_ID when COUNT_SOURCE = "sheet".');
      const sheet = SpreadsheetApp.openById(COUNT_SHEET_ID).getSheets()[0];
      const value = sheet.getRange('A1').getValue();
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error('Sheet A1 is not a number: "' + value + '"');
      return n;
    }

    case 'api':
      // Placeholder — Google Workspace Marketplace does not currently expose
      // a public endpoint returning total sales for a lifetime-SKU. If that
      // changes, replace this stub with a UrlFetchApp.fetch(...) call and
      // parse the response.
      throw new Error('COUNT_SOURCE = "api" is not implemented: Google does ' +
                      'not expose this data via public API yet. Use "manual" ' +
                      'or "sheet" instead.');

    case 'manual':
    default:
      return MANUAL_COUNT;
  }
}

/**
 * Deliver an alert via Chat webhook (preferred) or log (fallback).
 */
function alert_(message) {
  Logger.log('[FOUNDING-MEMBER] ' + message);

  if (!ALERT_CHAT_WEBHOOK) return;

  try {
    UrlFetchApp.fetch(ALERT_CHAT_WEBHOOK, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        text: '*emAIl Sentinel — founding-member quota*\n' + message
      }),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Failed to send Chat alert: ' + e);
  }
}

/**
 * One-time setup: schedule the daily check to run around 9 AM every day.
 * Run this from the Apps Script editor once after pasting the file.
 */
function installDailyTrigger() {
  // Remove any prior triggers for this handler so we don't duplicate.
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'checkFoundingMemberQuota') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('checkFoundingMemberQuota')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log('Daily trigger installed. checkFoundingMemberQuota runs ~9 AM daily.');
}

/**
 * One-click tear-down if you want to stop the monitor.
 */
function uninstallDailyTrigger() {
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'checkFoundingMemberQuota') {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  Logger.log('Removed ' + removed + ' trigger(s).');
}
