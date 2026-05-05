// ─────────────────────────────────────────────────────────────────────────────
// PromoCodeServiceTests.gs
//
// DEV TOOL — runs in YOUR personal standalone Apps Script project, the SAME
// project as PromoCodeService.gs and PromoCodeAdmin.gs.
// Do NOT bundle this with the emAIl Sentinel end-user add-on.
//
// PURPOSE:
//   Hermetic self-test for the promo redemption service. Exercises every
//   branch of doPost (auth + parse) and redeemCode_ (data-layer state
//   machine) against a temporary scratch sheet that the test creates and
//   deletes itself — production 'Codes' rows are never touched.
//
//   Mirrors the runMcpLoopbackTests pattern in the add-on's Diagnostics.gs:
//   synthesize inputs in memory, call the production functions directly,
//   assert outcome + error substring, log per-test PASS/FAIL plus an
//   aggregate summary, and return a structured result for scheduled agents.
//
// HOW TO RUN:
//   1. PROMO_SHEET_ID and SERVICE_TOKEN must already be set in Script
//      Properties (run configureAdmin and configureService first).
//   2. In the editor function dropdown, pick runPromoServiceTests, click Run.
//   3. View → Logs to see per-test output and the final
//      "Promo service self-test: X/Y passed" line.
//
// NOTES:
//   - redeemCode_ takes a script-wide LockService lock. A real buyer hitting
//     the live Web App during a test run will block on the lock for ~30 s.
//     Acceptable for a manually-run dev tool; do not schedule more than once
//     a day.
//   - doPost auth/parse failures return before reaching redeemCode_, so they
//     never touch any sheet — safe to run unconditionally.
// ─────────────────────────────────────────────────────────────────────────────

const TEST_SHEET_NAME_ = '_PromoTest_';

function runPromoServiceTests() {
  const props   = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('PROMO_SHEET_ID');
  const token   = props.getProperty('SERVICE_TOKEN');
  if (!sheetId || !token) {
    Logger.log('SKIPPED — set PROMO_SHEET_ID and SERVICE_TOKEN first ' +
               'via configureAdmin / configureService.');
    return { passed: 0, total: 0, allPassed: false, skipped: true, results: [] };
  }

  const ss = SpreadsheetApp.openById(sheetId);
  const orphan = ss.getSheetByName(TEST_SHEET_NAME_);
  if (orphan) ss.deleteSheet(orphan);

  const sheet = ss.insertSheet(TEST_SHEET_NAME_);
  sheet.appendRow(['Code', 'Batch', 'Created', 'Status', 'Redeemed By', 'Redeemed At', 'Label']);
  const now = new Date().toISOString();
  sheet.appendRow(['SENT-TEST-OKAY', 'test', now, 'unused',   '',                  '',  '']);
  sheet.appendRow(['SENT-TEST-USED', 'test', now, 'redeemed', 'prior@example.com', now, '']);
  sheet.appendRow(['SENT-TEST-VOID', 'test', now, 'voided',   '',                  '',  '']);
  sheet.appendRow(['SENT-TEST-WHAT', 'test', now, 'mystery',  '',                  '',  '']);
  SpreadsheetApp.flush();

  const results = [];
  function record(name, passed, detail) {
    results.push({ name: name, passed: passed, detail: detail || '' });
    Logger.log('  [' + (passed ? 'PASS' : 'FAIL') + '] ' + name +
               (detail ? ' — ' + detail : ''));
  }
  function callRedeem(code, email) {
    const out = redeemCode_(code, email, TEST_SHEET_NAME_);
    return JSON.parse(out.getContent());
  }
  function callDoPost(parameter, contents) {
    const out = doPost({ parameter: parameter, postData: { contents: contents } });
    return JSON.parse(out.getContent());
  }
  function errMatches(r, pattern) {
    return r.ok === false && pattern.test(r.error || '');
  }

  Logger.log('=== Promo service self-test ===');

  try {
    // ── redeemCode_ data-layer branches ──────────────────────────────────

    let r = callRedeem('SENT-TEST-OKAY', 'buyer@example.com');
    record('valid first redemption returns ok=true',
      r.ok === true, JSON.stringify(r));

    const okayRow = sheet.getRange(2, 1, 1, 7).getValues()[0];
    record('redemption persists status, email, and timestamp',
      okayRow[3] === 'redeemed' &&
      okayRow[4] === 'buyer@example.com' &&
      typeof okayRow[5] === 'string' && okayRow[5].length > 0,
      'row=' + JSON.stringify(okayRow));

    r = callRedeem('SENT-TEST-OKAY', 'someone-else@example.com');
    record('second redemption of same code is blocked',
      errMatches(r, /already redeemed/i), JSON.stringify(r));

    r = callRedeem('SENT-TEST-USED', 'buyer@example.com');
    record('pre-redeemed seed code is rejected',
      errMatches(r, /already redeemed/i), JSON.stringify(r));

    r = callRedeem('SENT-TEST-VOID', 'buyer@example.com');
    record('voided code is rejected',
      errMatches(r, /no longer valid/i), JSON.stringify(r));

    r = callRedeem('SENT-TEST-WHAT', 'buyer@example.com');
    record('unknown status is rejected',
      errMatches(r, /not valid/i), JSON.stringify(r));

    r = callRedeem('SENT-MISS-MISS', 'buyer@example.com');
    record('code not in sheet is rejected',
      errMatches(r, /not found/i), JSON.stringify(r));

    // ── doPost auth + parse branches (do not reach redeemCode_) ─────────

    r = callDoPost({}, '{}');
    record('doPost with no token rejects with Unauthorized',
      errMatches(r, /unauthorized/i), JSON.stringify(r));

    r = callDoPost({ t: '' }, '{}');
    record('doPost with empty token rejects with Unauthorized',
      errMatches(r, /unauthorized/i), JSON.stringify(r));

    r = callDoPost({ t: 'definitely-wrong-token' }, '{}');
    record('doPost with wrong token rejects with Unauthorized',
      errMatches(r, /unauthorized/i), JSON.stringify(r));

    r = callDoPost({ t: token }, 'not-json');
    record('doPost with malformed JSON rejects with Invalid request',
      errMatches(r, /invalid request/i), JSON.stringify(r));

    r = callDoPost({ t: token }, JSON.stringify({ email: 'x@y.com' }));
    record('doPost missing code field rejects with Missing fields',
      errMatches(r, /missing fields/i), JSON.stringify(r));

    r = callDoPost({ t: token }, JSON.stringify({ code: 'SENT-AAAA-AAAA' }));
    record('doPost missing email field rejects with Missing fields',
      errMatches(r, /missing fields/i), JSON.stringify(r));

    r = callDoPost({ t: token }, JSON.stringify({ code: '!!!  ###', email: 'x@y.com' }));
    record('doPost all-junk code strips to empty and rejects with Missing fields',
      errMatches(r, /missing fields/i), JSON.stringify(r));

    // ── normalizeCode_ pure-logic branches ──────────────────────────────

    record('normalizeCode_ uppercases lowercase letters',
      normalizeCode_('sent-aaaa-bbbb') === 'SENT-AAAA-BBBB');
    record('normalizeCode_ strips whitespace and punctuation',
      normalizeCode_('  sent-aaaa-bbbb!!  ') === 'SENT-AAAA-BBBB');
    record('normalizeCode_ preserves hyphens',
      normalizeCode_('SENT-1234-5678') === 'SENT-1234-5678');
    record('normalizeCode_ on falsy input returns empty string',
      normalizeCode_('') === '' &&
      normalizeCode_(null) === '' &&
      normalizeCode_(undefined) === '');

  } finally {
    const cleanup = ss.getSheetByName(TEST_SHEET_NAME_);
    if (cleanup) ss.deleteSheet(cleanup);
  }

  const passedCount = results.filter(function(r) { return r.passed; }).length;
  const totalCount  = results.length;
  Logger.log('Promo service self-test: ' + passedCount + '/' + totalCount + ' passed');

  return {
    passed: passedCount,
    total: totalCount,
    allPassed: passedCount === totalCount,
    results: results
  };
}
