// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * Diagnostics.gs — Server-side self-tests and diagnostic helpers.
 *
 * These functions are dev-only entry points. They are NOT exposed in any
 * user-facing card and are NOT triggered by the time-driven runMailCheck
 * cycle. To invoke:
 *   - Apps Script editor: pick the function from the dropdown, click Run.
 *   - clasp run <fn>:      after `clasp login`, runs against the deployed
 *                          project. Useful from CI.
 *   - Scheduled remote agent: included in a routine that calls these via
 *                              the Apps Script API (see the existing
 *                              Asana V1 check for the pattern).
 *
 * Output goes to the activity log via the standard log-buffering helpers,
 * so results show up alongside normal trigger output and persist in the
 * 60-line ring buffer.
 */

// ── MCP loopback self-test ───────────────────────────────────────────────
//
// Calls sendMcpAlert_ directly against each mode of the Cloudflare Worker
// loopback (see testing/mcp-loopback/) and verifies that the dispatcher
// produces the expected 'sent' / 'failed' outcome with the expected error
// substring. Covers every code-path branch in McpServers.gs sendMcpAlert_:
// HTTP-error tier, JSON-RPC envelope error, MCP tool-level error
// (body.result.isError = true), Streamable-HTTP SSE response parsing, and
// the swallow-on-non-JSON ack path.
//
// To point at a different worker URL (e.g. a local fork of the loopback),
// edit MCP_LOOPBACK_BASE_URL_ below and re-push via clasp.

const MCP_LOOPBACK_BASE_URL_ =
  'https://email-sentinel-mcp-loopback.jjjjj-enterprises-llc.workers.dev';

// Each row: which mode to hit, what outcome the dispatcher should produce,
// and (for 'failed') a substring that must appear in the thrown error
// message. Substrings are matched literally and case-sensitively.
const MCP_LOOPBACK_MODES_ = [
  { mode: 'success',       outcome: 'sent',   detail: '' },
  { mode: 'sse',           outcome: 'sent',   detail: '' },
  { mode: 'isError',       outcome: 'failed', detail: 'tool error' },
  { mode: 'isErrorSse',    outcome: 'failed', detail: 'tool error' },
  { mode: 'jsonrpcError',  outcome: 'failed', detail: 'error:' },
  { mode: 'http401',       outcome: 'failed', detail: 'HTTP 401' },
  { mode: 'http500',       outcome: 'failed', detail: 'HTTP 500' },
  { mode: 'empty',         outcome: 'sent',   detail: '' },
  { mode: 'malformedJson', outcome: 'sent',   detail: '' }
];

/**
 * Run every loopback mode and write a per-mode PASS / FAIL line to the
 * activity log, plus a final aggregate "X/Y passed" summary. Returns a
 * structured result object so callers (clasp run, scheduled agents) can
 * read pass count programmatically.
 *
 * The function is hermetic: it constructs synthetic rule + email + server
 * objects in memory, calls sendMcpAlert_, and never touches saved rules
 * or settings.
 */
function runMcpLoopbackTests() {
  const fakeRule  = { name: 'MCP loopback self-test', alerts: {} };
  const fakeEmail = {
    id: 'loopback-fake-id',
    from: 'Loopback Tester <test@example.com>',
    subject: 'Loopback self-test message',
    body: '(synthetic body — not a real email)',
    receivedDateTime: formatLocalDateTime_(new Date()),
    receivedMillis: Date.now(),
    attachmentNames: [],
    hasAttachments: false
  };
  const fakeAlert = 'Loopback self-test alert content.';

  startLogBuffering();
  activityLog('=== MCP loopback self-test ===');

  const results = [];
  MCP_LOOPBACK_MODES_.forEach(function(spec) {
    const server = {
      id:               'loopback-' + spec.mode,
      name:             'Loopback ' + spec.mode,
      type:             'custom',
      endpoint:         MCP_LOOPBACK_BASE_URL_ + '/?mode=' + spec.mode,
      authToken:        'Bearer test',
      toolName:         'loopback_test_tool',
      toolArgsTemplate: '{"subject":"{{subject}}","message":"{{message}}","from":"{{from}}","rule":"{{rule}}"}'
    };

    var actual       = 'sent';
    var actualDetail = '';
    try {
      sendMcpAlert_(server, fakeRule, fakeEmail, fakeAlert);
    } catch (e) {
      actual       = 'failed';
      actualDetail = (e && e.message) ? e.message : String(e);
    }

    const outcomeMatch = actual === spec.outcome;
    const detailMatch  = !spec.detail || actualDetail.indexOf(spec.detail) >= 0;
    const passed       = outcomeMatch && detailMatch;

    results.push({
      mode: spec.mode,
      expected: spec.outcome + (spec.detail ? ' (contains "' + spec.detail + '")' : ''),
      actual: actual + (actualDetail ? ' (' + actualDetail.substring(0, 120) + ')' : ''),
      passed: passed
    });

    activityLog('  [' + (passed ? 'PASS' : 'FAIL') + '] ' + spec.mode +
                ' — expected ' + spec.outcome +
                (spec.detail ? ' (' + spec.detail + ')' : '') +
                ' — actual ' + actual +
                (actualDetail ? ': ' + actualDetail.substring(0, 120) : ''));
  });

  const passedCount = results.reduce(function(n, r) { return n + (r.passed ? 1 : 0); }, 0);
  const totalCount  = results.length;
  activityLog('MCP loopback self-test: ' + passedCount + '/' + totalCount + ' passed');
  flushLog();

  return {
    passed:  passedCount,
    total:   totalCount,
    allPassed: passedCount === totalCount,
    results: results
  };
}
