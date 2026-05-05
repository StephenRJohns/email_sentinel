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
    if (row[COL_LABEL_]) line += ' | note: ' + row[COL_LABEL_];
    Logger.log(line);
  });
  Logger.log(rows.length + ' code(s) shown.');
}

// ─────────────────────────────────────────────────────────────────────────────
// VOID A CODE — set VOID_TARGET below, then run runVoidCode
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
    sheet.appendRow(['Code', 'Batch', 'Created', 'Status', 'Redeemed By', 'Redeemed At', 'Label']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(4, 80);
    sheet.setColumnWidth(5, 220);
  }
  return sheet;
}
