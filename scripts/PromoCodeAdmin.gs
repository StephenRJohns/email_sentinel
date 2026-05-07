// ─────────────────────────────────────────────────────────────────────────────
// PromoCodeAdmin.gs
//
// DEV TOOL — runs in YOUR personal standalone Apps Script project.
// Do NOT bundle this with the emAIl Sentinel end-user add-on.
//
// Put this file AND PromoCodeService.gs into the same standalone project.
//
// PURPOSE:
//   Generate single-use Pro promo codes, write them to a Google Sheet,
//   and report on their redemption status. You run everything from the
//   Apps Script editor's function dropdown — no UI needed.
//
// ─────────────────────────────────────────────────────────────────────────────
// SETUP (one-time, in order):
// ─────────────────────────────────────────────────────────────────────────────
//
//   1. Create a new Google Sheet. Copy its Sheet ID from the URL
//      (the long string between /d/ and /edit).
//
//   2. In this same Apps Script project, edit configureAdmin below:
//        - paste the Sheet ID into the sheetId variable
//      Run configureAdmin once from the editor, then REVERT THE BODY
//      TO EMPTY STRINGS before committing — the value is now stored
//      in Script Properties and never needs to be in source code.
//
//   3. Run setupSheet once to create the header row.
//
//   4. Done. Generate your first batch with runGenerateBatch.
//
// ─────────────────────────────────────────────────────────────────────────────
// GENERATING CODES:
// ─────────────────────────────────────────────────────────────────────────────
//
//   1. Edit BATCH_NAME and BATCH_QTY below.
//   2. Optionally set BATCH_LABEL to a note (e.g. 'YouTube reviewers May 2026').
//   3. Select runGenerateBatch from the function dropdown and click Run.
//   4. New codes appear immediately in the Sheet.
//   5. Revert BATCH_NAME / BATCH_QTY / BATCH_LABEL to their placeholder
//      values before committing.
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Batch generation config — edit before running, revert before committing ──
const BATCH_NAME  = 'my-batch';        // e.g. 'reviewers-may-2026'
const BATCH_QTY   = 10;               // number of codes to generate
const BATCH_LABEL = '';               // optional note stored alongside codes

// ── Listing config ────────────────────────────────────────────────────────────
// Leave empty to list all batches/codes; set to a batch name to filter.
const LIST_BATCH_FILTER = '';

// ── Sheet layout ──────────────────────────────────────────────────────────────
const CODES_SHEET_NAME_ = 'Codes';
const COL_CODE_         = 0;
const COL_BATCH_        = 1;
const COL_CREATED_      = 2;
const COL_STATUS_       = 3;  // 'unused' | 'redeemed' | 'voided'
const COL_REDEEMED_BY_  = 4;
const COL_REDEEMED_AT_  = 5;
const COL_LABEL_        = 6;
const COL_ASSIGNED_TO_  = 7;  // free-text — name, email, UT session, etc.
const COL_ASSIGNED_AT_  = 8;  // ISO timestamp set when 'assign' admin action runs

// Total column count for header-row generation. Bumping this value here is
// the only schema-extension needed — ensureColumnsUpToDate_ widens existing
// sheets on next admin-action invocation.
const CODES_COL_COUNT_  = 9;
const CODES_HEADER_ROW_ = ['Code', 'Batch', 'Created', 'Status', 'Redeemed By',
                           'Redeemed At', 'Label', 'Assigned To', 'Assigned At'];

// Characters used in generated codes — visually distinct (no 0/O/1/I/L).
const CODE_CHARS_ = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME SETUP — run configureAdmin once, then revert body to empty strings
// ─────────────────────────────────────────────────────────────────────────────

function configureAdmin() {
  // Fill in below, run ONCE from the editor, then REVERT TO EMPTY STRINGS
  // before committing. Values are stored in Script Properties.
  const sheetId = '';
  if (!sheetId) throw new Error('Fill in sheetId before running configureAdmin.');
  PropertiesService.getScriptProperties().setProperty('PROMO_SHEET_ID', sheetId);
  Logger.log('Admin configured. PROMO_SHEET_ID stored in Script Properties.');
}

function setupSheet() {
  const sheet = getCodesSheet_();
  Logger.log('Sheet ready. Add rows by running runGenerateBatch.');
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE — edit BATCH_NAME / BATCH_QTY / BATCH_LABEL above, then run this
// ─────────────────────────────────────────────────────────────────────────────

function runGenerateBatch() {
  if (BATCH_NAME === 'my-batch') {
    throw new Error('Set BATCH_NAME to something meaningful before running.');
  }
  const codes = generateBatch_(BATCH_NAME, BATCH_QTY, BATCH_LABEL);
  Logger.log('Generated ' + codes.length + ' codes in batch "' + BATCH_NAME + '":');
  codes.forEach(function(c) { Logger.log('  ' + c); });
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTING — run any of these directly; set LIST_BATCH_FILTER to filter
// ─────────────────────────────────────────────────────────────────────────────

function runListBatches() {
  const sheet = getCodesSheet_();
  const data = sheet.getDataRange().getValues().slice(1);
  const batches = {};
  data.forEach(function(row) {
    const b = row[COL_BATCH_] || '(none)';
    if (!batches[b]) batches[b] = { total: 0, unused: 0, redeemed: 0, voided: 0 };
    batches[b].total++;
    const st = row[COL_STATUS_];
    if (st === 'redeemed') batches[b].redeemed++;
    else if (st === 'voided') batches[b].voided++;
    else batches[b].unused++;
  });
  Logger.log('=== Batch Summary ===');
  Object.keys(batches).sort().forEach(function(b) {
    const s = batches[b];
    Logger.log(b + ': ' + s.total + ' total | ' + s.unused + ' unused | ' + s.redeemed + ' redeemed | ' + s.voided + ' voided');
  });
}

function runListCodes() {
  const sheet = getCodesSheet_();
  const data = sheet.getDataRange().getValues().slice(1);
  const rows = LIST_BATCH_FILTER
    ? data.filter(function(r) { return r[COL_BATCH_] === LIST_BATCH_FILTER; })
    : data;
  Logger.log('=== Codes' + (LIST_BATCH_FILTER ? ' for "' + LIST_BATCH_FILTER + '"' : ' (all)') + ' ===');
  rows.forEach(function(row) {
    let line = row[COL_CODE_] + ' | ' + row[COL_BATCH_] + ' | ' + row[COL_STATUS_];
    if (row[COL_STATUS_] === 'redeemed') {
      line += ' | by: ' + row[COL_REDEEMED_BY_] + ' | at: ' + row[COL_REDEEMED_AT_];
    }
    if (row[COL_ASSIGNED_TO_]) {
      line += ' | assigned: ' + row[COL_ASSIGNED_TO_];
    }
    if (row[COL_LABEL_]) line += ' | label: ' + row[COL_LABEL_];
    Logger.log(line);
  });
  Logger.log(rows.length + ' code(s) shown.');
}

// ─────────────────────────────────────────────────────────────────────────────
// VOID A SINGLE CODE — set VOID_TARGET below, then run runVoidCode
// ─────────────────────────────────────────────────────────────────────────────

const VOID_TARGET = ''; // e.g. 'SENT-AB3K-XY2M'

function runVoidCode() {
  if (!VOID_TARGET) throw new Error('Set VOID_TARGET to the code you want to void.');
  const sheet = getCodesSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_CODE_] === VOID_TARGET.toUpperCase().trim()) {
      if (data[i][COL_STATUS_] === 'redeemed') {
        Logger.log('Cannot void — already redeemed by ' + data[i][COL_REDEEMED_BY_]);
        return;
      }
      sheet.getRange(i + 1, COL_STATUS_ + 1).setValue('voided');
      Logger.log('Voided: ' + VOID_TARGET);
      return;
    }
  }
  Logger.log('Code not found: ' + VOID_TARGET);
}

// ─────────────────────────────────────────────────────────────────────────────
// VOID ALL UNUSED CODES IN A BATCH — set VOID_BATCH_TARGET, then run
// runVoidBatch. Round-close cleanup helper: voids every 'unused' code in
// the named batch in one pass. Redeemed codes are skipped (the per-user
// Pro tier flip is persistent in the add-on's UserProperties and cannot
// be revoked remotely). Already-voided codes are skipped (idempotent).
// ─────────────────────────────────────────────────────────────────────────────

const VOID_BATCH_TARGET = ''; // e.g. 'usertest-round-001'

function runVoidBatch() {
  if (!VOID_BATCH_TARGET) {
    throw new Error('Set VOID_BATCH_TARGET to the batch name whose unused codes you want to void.');
  }
  const sheet = getCodesSheet_();
  const data = sheet.getDataRange().getValues();
  const batchName = VOID_BATCH_TARGET.trim();
  const voidedCodes = [];
  let skippedRedeemed = 0;
  let skippedAlreadyVoided = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_BATCH_] !== batchName) continue;
    const status = data[i][COL_STATUS_];
    if (status === 'redeemed') { skippedRedeemed++; continue; }
    if (status === 'voided')   { skippedAlreadyVoided++; continue; }
    sheet.getRange(i + 1, COL_STATUS_ + 1).setValue('voided');
    voidedCodes.push(data[i][COL_CODE_]);
  }

  Logger.log('=== Batch void: "' + batchName + '" ===');
  if (voidedCodes.length === 0 && skippedRedeemed === 0 && skippedAlreadyVoided === 0) {
    Logger.log('No rows matched batch name "' + batchName + '" — check for typos.');
    return;
  }
  Logger.log('Voided ' + voidedCodes.length + ' code(s):');
  voidedCodes.forEach(function(c) { Logger.log('  ' + c); });
  Logger.log('Skipped (already redeemed): ' + skippedRedeemed);
  Logger.log('Skipped (already voided): ' + skippedAlreadyVoided);
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateBatch_(batchName, quantity, label) {
  const sheet = getCodesSheet_();
  const data = sheet.getDataRange().getValues();
  const existing = new Set(data.slice(1).map(function(r) { return r[COL_CODE_]; }));

  const now = new Date().toISOString();
  const rows = [];
  let attempts = 0;
  while (rows.length < quantity && attempts < quantity * 20) {
    attempts++;
    const code = randomCode_();
    if (!existing.has(code)) {
      existing.add(code);
      rows.push([code, batchName, now, 'unused', '', '', label || '']);
    }
  }
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  }
  return rows.map(function(r) { return r[0]; });
}

function randomCode_() {
  let code = 'SENT-';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS_[Math.floor(Math.random() * CODE_CHARS_.length)];
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS_[Math.floor(Math.random() * CODE_CHARS_.length)];
  }
  return code;
}

function getCodesSheet_() {
  const sheetId = PropertiesService.getScriptProperties().getProperty('PROMO_SHEET_ID');
  if (!sheetId) throw new Error('Run configureAdmin first to set PROMO_SHEET_ID.');
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(CODES_SHEET_NAME_);
  if (!sheet) {
    sheet = ss.insertSheet(CODES_SHEET_NAME_);
    sheet.appendRow(CODES_HEADER_ROW_);
    sheet.getRange(1, 1, 1, CODES_COL_COUNT_).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(4, 80);
    sheet.setColumnWidth(5, 220);
    sheet.setColumnWidth(8, 220);
  }
  ensureColumnsUpToDate_(sheet);
  return sheet;
}

// Existing sheets created before a schema bump have a shorter header row.
// Detect that and widen them on next access. Idempotent — no-op when the
// header is already current. Adds missing header cells in their proper
// position; user-entered data in those cells (if any pre-existed) is
// preserved because we only write cells whose current value is empty.
function ensureColumnsUpToDate_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol >= CODES_COL_COUNT_) {
    // Even when wide enough, fill any blank header cells (defensive).
    const headerRange = sheet.getRange(1, 1, 1, CODES_COL_COUNT_);
    const current = headerRange.getValues()[0];
    let needWrite = false;
    for (let i = 0; i < CODES_COL_COUNT_; i++) {
      if (!current[i] && CODES_HEADER_ROW_[i]) { current[i] = CODES_HEADER_ROW_[i]; needWrite = true; }
    }
    if (needWrite) headerRange.setValues([current]);
    return;
  }
  // Sheet is narrower than the schema — extend it.
  for (let c = lastCol + 1; c <= CODES_COL_COUNT_; c++) {
    sheet.getRange(1, c).setValue(CODES_HEADER_ROW_[c - 1]).setFontWeight('bold');
  }
}
