#!/usr/bin/env node
/*
 * Produce an annotated, timestamped copy of e2e_test_plan.md under test_runs/
 * based on Playwright's JSON results. Invoked automatically by run_e2e_tests.sh.
 *
 * Mapping rule: each Playwright test is titled "S<N>: ..." (or "S<A>+S<B>: ...").
 * The test result propagates to every `- [ ]` checkbox inside the matching
 * section(s) of the plan:
 *   - all tests in section passed  → checkboxes become - [✅]
 *   - any test in section failed   → checkboxes become - [❌]
 *   - no test in section           → checkbox left untouched
 * A per-test "Automation results" block is also injected at the top of every
 * section that has automated coverage, with <span style="color:darkred">...</span>
 * error lines under each failed test.
 */
const fs = require('fs');
const path = require('path');

const TESTING_DIR     = path.resolve(__dirname);
const DEFAULT_RESULTS = path.join(TESTING_DIR, '.last_run_results.json');
const DEFAULT_PLAN    = path.join(TESTING_DIR, 'e2e_test_plan.md');
const DEFAULT_OUT_DIR = path.join(TESTING_DIR, 'test_runs');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { results: DEFAULT_RESULTS, plan: DEFAULT_PLAN, out: DEFAULT_OUT_DIR };
  for (let i = 0; i < args.length; i += 2) {
    const k = (args[i] || '').replace(/^--/, '');
    if (k in opts) opts[k] = args[i + 1];
  }
  return opts;
}

function collectSpecs(node, acc = []) {
  if (!node) return acc;
  if (Array.isArray(node.specs))  for (const s of node.specs)  acc.push(s);
  if (Array.isArray(node.suites)) for (const sub of node.suites) collectSpecs(sub, acc);
  return acc;
}

function stripAnsi(s) { return String(s).replace(/\u001B\[[0-9;]*m/g, ''); }

function specStatus(spec) {
  const tests = spec.tests || [];
  let failed = false, passed = false, skipped = false, errorMsg = '';
  for (const t of tests) {
    for (const r of (t.results || [])) {
      if (r.status === 'passed' || r.status === 'expected') passed = true;
      else if (r.status === 'skipped') skipped = true;
      else {
        failed = true;
        if (!errorMsg && r.error && r.error.message) {
          errorMsg = stripAnsi(r.error.message).split('\n')[0].trim();
        }
      }
    }
  }
  if (failed)  return { status: 'failed',  error: errorMsg };
  if (passed)  return { status: 'passed',  error: '' };
  if (skipped) return { status: 'skipped', error: '' };
  return { status: 'unknown', error: '' };
}

function sectionsForTitle(title) {
  const m = /^((?:S\d+)(?:\+S\d+)*):/.exec(title);
  if (!m) return [];
  return m[1].split('+').map(s => parseInt(s.slice(1), 10));
}

const pad2 = n => String(n).padStart(2, '0');
function timestampParts(d = new Date()) {
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
  };
}

function main() {
  const opts = parseArgs();
  if (!fs.existsSync(opts.results)) {
    console.error(`archive_run: no results file at ${opts.results} — skipping archive.`);
    process.exit(2);
  }
  if (!fs.existsSync(opts.plan)) {
    console.error(`archive_run: no plan file at ${opts.plan}.`);
    process.exit(2);
  }

  const results   = JSON.parse(fs.readFileSync(opts.results, 'utf8'));
  const planLines = fs.readFileSync(opts.plan, 'utf8').split('\n');
  const specs     = collectSpecs(results).map(s => ({ title: s.title, ...specStatus(s) }));

  const bySection = new Map();
  for (const spec of specs) {
    for (const n of sectionsForTitle(spec.title)) {
      if (!bySection.has(n)) bySection.set(n, []);
      bySection.get(n).push(spec);
    }
  }

  const out = [];
  let currentSection   = null;
  let summaryInserted  = false;
  const sectionHeaderRe = /^## (\d+) · /;
  const checkboxRe      = /^(\s*)- \[ \] (.*)$/;

  for (const line of planLines) {
    const sh = sectionHeaderRe.exec(line);
    if (sh) {
      currentSection  = parseInt(sh[1], 10);
      summaryInserted = false;
      out.push(line);
      continue;
    }

    const cb = checkboxRe.exec(line);

    if (cb && currentSection != null && !summaryInserted) {
      const tests = bySection.get(currentSection) || [];
      if (tests.length > 0) {
        out.push('**Automation results:**');
        out.push('');
        for (const t of tests) {
          const mark = t.status === 'passed' ? '✅'
                     : t.status === 'failed' ? '❌'
                     : '⊘';
          out.push(`- ${mark} ${t.title}`);
          if (t.status === 'failed' && t.error) {
            out.push(`  <span style="color:darkred">${t.error}</span>`);
          }
        }
        out.push('');
      }
      summaryInserted = true;
    }

    if (cb && currentSection != null) {
      const tests = bySection.get(currentSection) || [];
      if (tests.length > 0) {
        const anyFailed = tests.some(t => t.status === 'failed');
        const allPassed = tests.every(t => t.status === 'passed');
        if (allPassed) { out.push(`${cb[1]}- [✅] ${cb[2]}`); continue; }
        if (anyFailed) { out.push(`${cb[1]}- [❌] ${cb[2]}`); continue; }
      }
    }

    out.push(line);
  }

  const ts       = timestampParts();
  const planBase = path.basename(opts.plan, '.md').replace(/_plan/, '_run');
  const fname    = `${ts.date} ${ts.time}_${planBase}.md`;
  fs.mkdirSync(opts.out, { recursive: true });
  const outPath = path.join(opts.out, fname);
  fs.writeFileSync(outPath, out.join('\n'));

  const counts = specs.reduce((a, s) => (a[s.status] = (a[s.status] || 0) + 1, a), {});
  console.log(`Archive written: ${outPath}`);
  console.log(`Tests — passed: ${counts.passed || 0}, failed: ${counts.failed || 0}, skipped: ${counts.skipped || 0}`);

  const firstFails = specs.filter(s => s.status === 'failed').slice(0, 5);
  if (firstFails.length > 0) {
    console.log('\nFirst failures:');
    for (const f of firstFails) console.log(`  ❌ ${f.title}\n     ${f.error}`);
  }
}

main();
