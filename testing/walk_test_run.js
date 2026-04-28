#!/usr/bin/env node
/*
 * walk_test_run.js — Interactive walk-through of the latest archived
 * Playwright run for manual checklist items still marked `- [ ]`.
 *
 * Workflow:
 *   1. Look in testing/test_runs/ for the latest file matching
 *      <YYYY-MM-DD>_<HH:MM:SS>_e2e_test_run.md.
 *   2. If there is no archived run from today, print a message and offer
 *      to launch run_free_e2e_tests.sh or run_pro_e2e_tests.sh. After
 *      the suite finishes, re-run this script to walk the new archive.
 *   3. Otherwise, walk every `- [ ]` line in section order and prompt
 *      for y / n / s / q.
 *   4. Edit the file in place after each answer, so Ctrl+C never loses
 *      progress past the last answered item.
 *
 * Answer key:
 *   y  pass            replaces `- [ ]` with `- [✅]`
 *   n  fail            replaces with `- [❌]` and prompts for a one-line
 *                      error description; the description is inserted
 *                      on the next line as
 *                      `<span style="color:darkred">DESC</span>`
 *   s  skip            leaves `- [ ]` untouched (e.g. for [Optional]
 *                      items you didn't run, or items you want to come
 *                      back to)
 *   q  quit            exits early; everything answered so far is
 *                      already saved
 *
 * Run from the repo root or anywhere — paths are resolved relative to
 * this script's location:
 *   node testing/walk_test_run.js
 */

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const TESTING_DIR = path.resolve(__dirname);
const RUNS_DIR    = path.join(TESTING_DIR, 'test_runs');
const FREE_RUN    = path.join(TESTING_DIR, 'run_free_e2e_tests.sh');
const PRO_RUN     = path.join(TESTING_DIR, 'run_pro_e2e_tests.sh');

const FILE_RE     = /^(\d{4}-\d{2}-\d{2})_(\d{2}:\d{2}:\d{2})_e2e_test_run\.md$/;
const CHECKBOX_RE = /^(\s*)- \[ \] (.*)$/;
const SECTION_RE  = /^## (\d+[a-z]?) · (.*)$/;

function pad2(n) { return String(n).padStart(2, '0'); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function findLatestRun() {
  if (!fs.existsSync(RUNS_DIR)) return null;
  const files = fs.readdirSync(RUNS_DIR)
    .filter(f => FILE_RE.test(f))
    .sort();
  return files.length ? path.join(RUNS_DIR, files[files.length - 1]) : null;
}

function isFromToday(filepath) {
  const m = FILE_RE.exec(path.basename(filepath));
  return !!m && m[1] === todayStr();
}

function countUnchecked(filepath) {
  const lines = fs.readFileSync(filepath, 'utf8').split('\n');
  return lines.filter(l => CHECKBOX_RE.test(l)).length;
}

function ask(rl, prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function offerSuiteAndExit(rl) {
  console.log(`\nNo archived test run from ${todayStr()} in ${RUNS_DIR}.`);
  const latest = findLatestRun();
  if (latest) {
    console.log(`Latest existing archive: ${path.basename(latest)}`);
  } else {
    console.log('No archived test runs at all yet.');
  }
  console.log('');
  console.log('Run the Playwright suite now?');
  console.log('  [f]ree  — run_free_e2e_tests.sh');
  console.log('  [p]ro   — run_pro_e2e_tests.sh (requires setTierPro in Apps Script first)');
  console.log('  [n]o    — exit without running');
  const ans = (await ask(rl, 'Choice: ')).trim().toLowerCase();
  rl.close();

  let cmd;
  if (ans === 'f' || ans === 'free') cmd = FREE_RUN;
  else if (ans === 'p' || ans === 'pro') cmd = PRO_RUN;
  else { console.log('Aborting.'); return; }

  if (!fs.existsSync(cmd)) {
    console.error(`ERROR: ${cmd} not found.`);
    process.exit(2);
  }
  console.log(`\nLaunching ${path.basename(cmd)} ...\n`);
  const res = spawnSync('bash', [cmd], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`\n${path.basename(cmd)} exited with status ${res.status}.`);
    // Don't return — Playwright failures still produce an archive worth walking.
  }
  console.log('\nDone. Re-run `node testing/walk_test_run.js` to walk the new archive interactively.');
}

async function walk(filepath, rl) {
  const total = countUnchecked(filepath);
  if (total === 0) {
    console.log('No unchecked `- [ ]` items remaining in this archive — nothing to walk.');
    return;
  }
  console.log(`Walking ${path.relative(process.cwd(), filepath)}`);
  console.log(`${total} unchecked item(s). Answer y / n / s / q for each.\n`);

  let lastPrintedSection = null;
  let answered = 0;
  let i = 0;

  // Re-read after every write so any external edits during the session
  // (rare, but possible) are picked up. Cheap on a ~400-line file.
  while (true) {
    const lines = fs.readFileSync(filepath, 'utf8').split('\n');
    if (i >= lines.length) break;

    // Track current section header by scanning backward from i.
    let currentSection = null;
    for (let j = i; j >= 0; j--) {
      const sh = SECTION_RE.exec(lines[j]);
      if (sh) { currentSection = `## ${sh[1]} · ${sh[2]}`; break; }
    }

    const line = lines[i];
    const cb = CHECKBOX_RE.exec(line);
    if (!cb) { i++; continue; }

    const indent = cb[1];
    const text   = cb[2];

    if (currentSection && currentSection !== lastPrintedSection) {
      console.log(`\n${currentSection}`);
      console.log('-'.repeat(Math.min(currentSection.length, 78)));
      lastPrintedSection = currentSection;
    }
    console.log(`\n  ${text}`);

    let ans = '';
    while (true) {
      ans = (await ask(rl, `  [${answered + 1}/${total}] → y/n/s/q: `)).trim().toLowerCase();
      if (['y', 'n', 's', 'q'].includes(ans)) break;
      console.log('  please answer y, n, s, or q');
    }
    if (ans === 'q') break;

    if (ans === 's') { answered++; i++; continue; }

    if (ans === 'y') {
      lines[i] = `${indent}- [✅] ${text}`;
      fs.writeFileSync(filepath, lines.join('\n'));
      answered++;
      i++;
    } else if (ans === 'n') {
      const desc = (await ask(rl, '  Error (one line, blank to skip): ')).trim();
      lines[i] = `${indent}- [❌] ${text}`;
      if (desc) {
        lines.splice(i + 1, 0, `${indent}  <span style="color:darkred">${desc}</span>`);
      }
      fs.writeFileSync(filepath, lines.join('\n'));
      answered++;
      i += desc ? 2 : 1;
    }
  }

  console.log(`\nAnswered ${answered}/${total}. Saved to ${path.relative(process.cwd(), filepath)}.`);
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const latest = findLatestRun();

  if (!latest || !isFromToday(latest)) {
    await offerSuiteAndExit(rl);
    return;
  }

  await walk(latest, rl);
  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
