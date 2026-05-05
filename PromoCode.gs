// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * PromoCode.gs — Single-use Pro promo-code redemption for the add-on.
 *
 * The service URL and token are stored in Script Properties only —
 * never in source code — so they are never visible on GitHub and never
 * exposed to external testers running a deployment where the properties
 * are not set.
 *
 * When Script Properties are not configured the promo section is hidden
 * from the Settings card entirely. Set the properties in production via
 * configurePromoService below, then push the add-on.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME SETUP — run once in the ADD-ON project, then revert body to empty
// ─────────────────────────────────────────────────────────────────────────────
//
//   1. Deploy PromoCodeService.gs as a Web App (see its setup instructions).
//   2. Note the deployment URL and the token you set in configureService.
//   3. Edit configurePromoService below — fill in serviceUrl and token.
//   4. In the Apps Script editor for THIS add-on project, select
//      configurePromoService from the function dropdown and click Run.
//   5. REVERT THE BODY TO EMPTY STRINGS before committing.
//      The values now live in this project's Script Properties.

function configurePromoService() {
  // Fill in below, run ONCE, then REVERT TO EMPTY STRINGS before committing.
  const serviceUrl = '';
  const token      = '';
  if (!serviceUrl || !token) {
    throw new Error('Fill in serviceUrl and token before running configurePromoService.');
  }
  PropertiesService.getScriptProperties().setProperties({
    PROMO_SERVICE_URL:   serviceUrl,
    PROMO_SERVICE_TOKEN: token
  });
  Logger.log('Promo service configured in Script Properties.');
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL API — called by Cards.gs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the configured service URL, or '' if not set.
 * Cards.gs uses this to decide whether to show the promo section.
 */
function getPromoServiceUrl_() {
  return PropertiesService.getScriptProperties().getProperty('PROMO_SERVICE_URL') || '';
}

/**
 * Call the validation service. Returns { ok: true } on success or
 * { ok: false, error: '...' } on failure.
 */
function redeemPromoCode_(code) {
  const url   = getPromoServiceUrl_();
  const token = PropertiesService.getScriptProperties().getProperty('PROMO_SERVICE_TOKEN') || '';
  if (!url || !token) return { ok: false, error: 'Promo codes not available.' };

  const userEmail = Session.getEffectiveUser().getEmail();
  try {
    const resp = UrlFetchApp.fetch(url + '?t=' + encodeURIComponent(token), {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ code: code, email: userEmail }),
      muteHttpExceptions: true
    });
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { ok: false, error: 'Could not reach promo service: ' + e.message };
  }
}
