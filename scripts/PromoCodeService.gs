// ─────────────────────────────────────────────────────────────────────────────
// PromoCodeService.gs
//
// DEV TOOL — runs in YOUR personal standalone Apps Script project,
// the SAME project as PromoCodeAdmin.gs.
// Do NOT bundle this with the emAIl Sentinel end-user add-on.
//
// PURPOSE:
//   A Web App endpoint the add-on calls to validate and atomically
//   mark a promo code as redeemed. Runs as the developer (you), so
//   it can write to your private Sheet regardless of who the add-on
//   user is.
//
// ─────────────────────────────────────────────────────────────────────────────
// SETUP (after completing PromoCodeAdmin.gs setup):
// ─────────────────────────────────────────────────────────────────────────────
//
//   1. Generate a random token (e.g. from a password manager or:
//        python3 -c "import secrets; print(secrets.token_hex(20))"
//      This is a shared secret between this service and the add-on.
//      Keep it private — do not commit it to git.
//
//   2. In this Apps Script project, edit configureService below:
//        - paste your token into the token variable
//        (PROMO_SHEET_ID is already stored from PromoCodeAdmin setup)
//      Run configureService once, then REVERT THE BODY TO EMPTY STRINGS
//      before committing.
//
//   3. Deploy this project as a Web App:
//        Apps Script editor → Deploy → New deployment
//        Type: Web app
//        Execute as: Me (your Google account)
//        Who has access: Anyone
//      Copy the deployment URL — you will need it in the add-on.
//
//   4. After deploying, configure the add-on with the URL and token.
//      See PromoCode.gs → configurePromoService for instructions.
//
//   5. To update the service after code changes: Deploy → Manage deployments
//      → edit the existing deployment and bump the version. Copy the new URL
//      if it changed and re-run configurePromoService in the add-on.
//
// ─────────────────────────────────────────────────────────────────────────────
// REQUIRED appsscript.json for this standalone project:
// ─────────────────────────────────────────────────────────────────────────────
//
//   {
//     "timeZone": "America/Chicago",
//     "dependencies": {},
//     "exceptionLogging": "STACKDRIVER",
//     "runtimeVersion": "V8",
//     "webapp": {
//       "executeAs": "USER_DEPLOYING",
//       "access": "ANYONE_ANONYMOUS"
//     },
//     "oauthScopes": [
//       "https://www.googleapis.com/auth/spreadsheets",
//       "https://www.googleapis.com/auth/script.external_request"
//     ]
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME SETUP — run once, then revert body to empty strings before committing
// ─────────────────────────────────────────────────────────────────────────────

function configureService() {
  // Fill in below, run ONCE from the editor, then REVERT TO EMPTY STRINGS
  // before committing. Values are stored in Script Properties.
  const token = '';
  if (!token) throw new Error('Fill in token before running configureService.');
  PropertiesService.getScriptProperties().setProperty('SERVICE_TOKEN', token);
  Logger.log('Service token stored in Script Properties.');
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB APP ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('SERVICE_TOKEN') || '';
    if (!token) return jsonError_('Service not configured.');

    const reqToken = (e.parameter && e.parameter.t) ? e.parameter.t : '';
    if (!reqToken || reqToken !== token) return jsonError_('Unauthorized.');

    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (_) {
      return jsonError_('Invalid request.');
    }

    const code  = normalizeCode_(body.code);
    const email = (body.email || '').trim();
    if (!code || !email) return jsonError_('Missing fields.');

    return redeemCode_(code, email);

  } catch (err) {
    Logger.log('PromoCodeService error: ' + err);
    return jsonError_('Internal error.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function redeemCode_(code, email, sheetName) {
  const sheetId = PropertiesService.getScriptProperties().getProperty('PROMO_SHEET_ID');
  if (!sheetId) return jsonError_('Service not configured.');

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (_) {
    return jsonError_('Service busy. Try again in a moment.');
  }

  try {
    const ss    = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName(sheetName || 'Codes');
    if (!sheet) return jsonError_('Service not configured.');

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] !== code) continue;

      const status = data[i][3];
      if (status === 'redeemed') return jsonError_('Code already redeemed.');
      if (status === 'voided')   return jsonError_('Code is no longer valid.');
      if (status !== 'unused')   return jsonError_('Code is not valid.');

      sheet.getRange(i + 1, 4).setValue('redeemed');
      sheet.getRange(i + 1, 5).setValue(email);
      sheet.getRange(i + 1, 6).setValue(new Date().toISOString());

      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return jsonError_('Code not found.');

  } finally {
    lock.releaseLock();
  }
}

function jsonError_(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeCode_(raw) {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST — run this from the editor to verify service is configured
// ─────────────────────────────────────────────────────────────────────────────

function smokeTest() {
  const token   = PropertiesService.getScriptProperties().getProperty('SERVICE_TOKEN');
  const sheetId = PropertiesService.getScriptProperties().getProperty('PROMO_SHEET_ID');
  Logger.log('SERVICE_TOKEN:  ' + (token   ? '[set, length ' + token.length + ']'   : '[NOT SET]'));
  Logger.log('PROMO_SHEET_ID: ' + (sheetId ? '[set, length ' + sheetId.length + ']' : '[NOT SET]'));
  if (token && sheetId) Logger.log('Service looks correctly configured.');
}
