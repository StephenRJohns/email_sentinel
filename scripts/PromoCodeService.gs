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
//   6. (Optional, for the local Python admin tool at tools/promo/.) Generate
//      a SECOND random token and run configureAdminToken once with it pasted,
//      then revert. ADMIN_TOKEN is stored alongside SERVICE_TOKEN in Script
//      Properties. The Python tool sends ADMIN_TOKEN as the URL parameter t=
//      to call mint / void / list / assign actions. SERVICE_TOKEN remains
//      redeem-only for the add-on. Skip this step if you do not plan to use
//      the Python tool — the editor flow (runGenerateBatch etc.) keeps
//      working with no admin token configured.
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

// Set ADMIN_TOKEN once after deploying for the first time. Generate a
// separate strong random value (different from SERVICE_TOKEN) so a leak of
// one cannot escalate the other. ADMIN_TOKEN holders can mint, void, list,
// and assign — full read/write access to the Codes Sheet via the Web App.
// Used by the local Python admin tool at tools/promo/. Never put this in
// the add-on's Script Properties — the add-on only needs SERVICE_TOKEN.
function configureAdminToken() {
  const token = '';
  if (!token) throw new Error('Fill in token before running configureAdminToken.');
  PropertiesService.getScriptProperties().setProperty('ADMIN_TOKEN', token);
  Logger.log('Admin token stored in Script Properties.');
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB APP ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const serviceToken = PropertiesService.getScriptProperties().getProperty('SERVICE_TOKEN') || '';
    const adminToken   = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || '';
    if (!serviceToken) return jsonError_('Service not configured.');

    const reqToken = (e.parameter && e.parameter.t) ? e.parameter.t : '';
    const isService = reqToken && reqToken === serviceToken;
    const isAdmin   = adminToken && reqToken && reqToken === adminToken;
    if (!isService && !isAdmin) return jsonError_('Unauthorized.');

    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (_) {
      return jsonError_('Invalid request.');
    }

    // Default action stays 'redeem' so existing add-on calls (which never
    // set an action) continue to work unchanged. SERVICE_TOKEN is permitted
    // for redeem only; admin actions require ADMIN_TOKEN.
    const action = (body.action || 'redeem').trim();

    if (action === 'redeem') {
      const code  = normalizeCode_(body.code);
      const email = (body.email || '').trim();
      if (!code || !email) return jsonError_('Missing fields.');
      return redeemCode_(code, email);
    }

    if (!isAdmin) return jsonError_('Admin token required for this action.');

    switch (action) {
      case 'mint':       return handleMint_(body);
      case 'void':       return handleVoid_(body);
      case 'void_batch': return handleVoidBatch_(body);
      case 'list':       return handleList_(body);
      case 'assign':     return handleAssign_(body);
      default:           return jsonError_('Unknown action: ' + action);
    }

  } catch (err) {
    Logger.log('PromoCodeService error: ' + err);
    return jsonError_('Internal error.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACTION HANDLERS — each requires ADMIN_TOKEN (gated above)
// ─────────────────────────────────────────────────────────────────────────────

function handleMint_(body) {
  const batch = (body.batch || '').trim();
  const qty   = parseInt(body.qty, 10);
  const label = (body.label || '').trim();
  if (!batch) return jsonError_('Missing batch name.');
  if (!qty || qty < 1 || qty > 1000) return jsonError_('qty must be 1..1000.');
  // generateBatch_ lives in PromoCodeAdmin.gs — same Apps Script project,
  // shared global scope.
  const codes = generateBatch_(batch, qty, label);
  return jsonOk_({ codes: codes });
}

function handleVoid_(body) {
  const code = normalizeCode_(body.code);
  if (!code) return jsonError_('Missing code.');
  const sheet = getCodesSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_CODE_] !== code) continue;
    if (data[i][COL_STATUS_] === 'redeemed') {
      return jsonError_('Cannot void — already redeemed by ' + data[i][COL_REDEEMED_BY_]);
    }
    sheet.getRange(i + 1, COL_STATUS_ + 1).setValue('voided');
    return jsonOk_({ code: code });
  }
  return jsonError_('Code not found.');
}

function handleVoidBatch_(body) {
  const batch = (body.batch || '').trim();
  if (!batch) return jsonError_('Missing batch name.');
  const sheet = getCodesSheet_();
  const data = sheet.getDataRange().getValues();
  const voided = [];
  let skippedRedeemed = 0;
  let skippedAlreadyVoided = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_BATCH_] !== batch) continue;
    const status = data[i][COL_STATUS_];
    if (status === 'redeemed') { skippedRedeemed++; continue; }
    if (status === 'voided')   { skippedAlreadyVoided++; continue; }
    sheet.getRange(i + 1, COL_STATUS_ + 1).setValue('voided');
    voided.push(data[i][COL_CODE_]);
  }
  return jsonOk_({
    voided: voided,
    skipped_redeemed: skippedRedeemed,
    skipped_already_voided: skippedAlreadyVoided
  });
}

function handleList_(body) {
  const filter = (body.batch || '').trim();
  const sheet = getCodesSheet_();
  const data = sheet.getDataRange().getValues().slice(1);
  const rows = filter
    ? data.filter(function(r) { return r[COL_BATCH_] === filter; })
    : data;
  const codes = rows.map(function(r) {
    return {
      code:         r[COL_CODE_]         || '',
      batch:        r[COL_BATCH_]        || '',
      created:      isoOf_(r[COL_CREATED_]),
      status:       r[COL_STATUS_]       || '',
      redeemed_by:  r[COL_REDEEMED_BY_]  || '',
      redeemed_at:  isoOf_(r[COL_REDEEMED_AT_]),
      label:        r[COL_LABEL_]        || '',
      assigned_to:  r[COL_ASSIGNED_TO_]  || '',
      assigned_at:  isoOf_(r[COL_ASSIGNED_AT_])
    };
  });
  return jsonOk_({ codes: codes });
}

function handleAssign_(body) {
  const code = normalizeCode_(body.code);
  const assignedTo = (body.assigned_to || '').trim();
  if (!code) return jsonError_('Missing code.');
  if (!assignedTo) return jsonError_('Missing assigned_to.');
  const sheet = getCodesSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_CODE_] !== code) continue;
    sheet.getRange(i + 1, COL_ASSIGNED_TO_ + 1).setValue(assignedTo);
    sheet.getRange(i + 1, COL_ASSIGNED_AT_ + 1).setValue(new Date().toISOString());
    return jsonOk_({
      code: code,
      assigned_to: assignedTo,
      batch: data[i][COL_BATCH_] || ''
    });
  }
  return jsonError_('Code not found.');
}

// Shared OK-response helper. Mirrors jsonError_ for consistency.
function jsonOk_(extra) {
  const payload = Object.assign({ ok: true }, extra || {});
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// Sheet cells holding ISO timestamps come back as either Date objects (when
// the cell was Date-typed at write time) or strings. Normalize to ISO string
// for the JSON response.
function isoOf_(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
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
