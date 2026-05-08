# Running the UserTesting Script Specs

Playwright translations of `usertesting/docs/script_a_core.md` (Script A — five Google channels, the active Round 1 script) and `usertesting/docs/script_b_power.md` (Script B — SMS path, **RETIRED**). One test per task in each spec, gated by env vars so missing credentials skip cleanly rather than fail.

For setup, Chrome profile config, and the rest of the automated suite, see `README.md`.

---

## Two ways to run

| Flavor | Command | When to use |
|---|---|---|
| **Wrapper** | `./testing/run_free_e2e_tests.sh tests/<spec>` | First run of a session — launches Chrome on port 9222, walks you through monitor + state-reset prompts, archives the run report. |
| **Direct `npx`** | `cd testing/playwright && npx playwright test tests/<spec>` | Fast iteration once Chrome is already on port 9222. Skips prompts and archiving. |

Both forward extra args to Playwright (`--grep`, `--debug`, `--headed`, etc.).

For convenience, two shell wrappers run the full Script A or Script B file:

```bash
./testing/run_script_a.sh           # all 7 Script A tests
./testing/run_script_b.sh           # all 5 Script B tests (RETIRED path; manual SMS verify)
./testing/run_script_a.sh --grep "Task 2a"   # extra args pass through to Playwright
```

---

## Whole spec files

```bash
# All of Script A (7 tests)
./testing/run_script_a.sh
./testing/run_free_e2e_tests.sh tests/script_a.spec.js
npx playwright test tests/script_a.spec.js

# All of Script B (5 tests; RETIRED — see file header)
./testing/run_script_b.sh
./testing/run_free_e2e_tests.sh tests/script_b.spec.js
npx playwright test tests/script_b.spec.js

# Both new specs at once
npx playwright test tests/script_a.spec.js tests/script_b.spec.js

# Pre-existing suite only (excludes the two new specs)
npx playwright test tests/e2e.spec.js
```

> **Important:** the wrapper with **no path argument** picks up every file under `tests/`, which now includes both new specs *plus* the original `e2e.spec.js`. Pass the path to scope.

---

## Script A — single tests

Task names are unique inside Script A, so `--grep` is enough. The path arg is added for clarity.

```bash
# T1 — home card loads
npx playwright test tests/script_a.spec.js --grep "Task 1"

# T2a — Gemini key + Test Gemini
npx playwright test tests/script_a.spec.js --grep "Task 2a"

# T2b — Promo code redemption (single-use; consumes TEST_PROMO_CODE)
npx playwright test tests/script_a.spec.js --grep "Task 2b"

# T2c — Add Chat space (needs CHAT_WEBHOOK_URL)
npx playwright test tests/script_a.spec.js --grep "Task 2c"

# T3 — Create rule with all five Google channels (best-effort; flaky per README)
npx playwright test tests/script_a.spec.js --grep "Task 3"

# T4 — Self-send + kebab Scan email now (sends a real email)
npx playwright test tests/script_a.spec.js --grep "Task 4"

# T5 — Always skips (interview)
npx playwright test tests/script_a.spec.js --grep "Task 5"
```

Replace `npx playwright test` with `./testing/run_free_e2e_tests.sh` (or `./testing/run_script_a.sh`) to use the wrapper.

---

## Script B — single tests

**Gotcha:** Task 1, Task 4, and Task 5 have **identical names** in both spec files, so `--grep "Task 1"` alone matches Script A *and* Script B. Always scope with the spec file path.

```bash
# T1 — home card loads
npx playwright test tests/script_b.spec.js --grep "Task 1"

# T2 — Gemini key + Textbelt + Send test SMS (consumes Textbelt's daily quota)
npx playwright test tests/script_b.spec.js --grep "Task 2"

# T3 — Create rule with SMS recipient ticked (best-effort)
npx playwright test tests/script_b.spec.js --grep "Task 3"

# T4 — Self-send + kebab Scan email now
npx playwright test tests/script_b.spec.js --grep "Task 4"

# T5 — Always skips
npx playwright test tests/script_b.spec.js --grep "Task 5"
```

---

## Useful flags

```bash
# Step through interactively (Playwright Inspector opens; tests pause at every step)
npx playwright test tests/script_a.spec.js --grep "Task 4" --debug

# Force a headed launch (Chrome connected via CDP is already headed; mostly useful with --debug)
npx playwright test tests/script_a.spec.js --headed

# Re-open the last HTML report
cd testing/playwright && npx playwright show-report

# Match by partial test title (any task starting with "Task 2" in Script A)
npx playwright test tests/script_a.spec.js --grep "Task 2"
```

---

## Pre-flight reminders that bite the first time

| Test | What to set up first |
|---|---|
| Any | Chrome on port 9222 (the wrapper handles this — run it once at session start). |
| A T2a / A T4 / B all | `GEMINI_API_KEY`, `GOOGLE_EMAIL` in `e2e.config.env`. |
| A T2b | `TEST_PROMO_CODE` minted via `python -m tools.promo.cli mint …`. Single-use — fresh code per run. |
| A T2c, A T3 chat tickbox | `CHAT_WEBHOOK_URL` (and optionally `CHAT_SPACE_NAME`). |
| B T2 | `SMS_PROVIDER` pre-selected in Settings on the test account (Material dropdown is not Playwright-controllable). `SMS_API_KEY`, `SMS_TEST_NUMBER` in env. Country code pre-set in Settings. Textbelt = 1 SMS/24h. |
| A T4, B T4 | Sends a real outbound email to `GOOGLE_EMAIL` and runs a real Gemini-backed scan against your live key. |
| A T2b retry | Fails on the second run — promo codes are single-use. Mint a fresh code. |
| B T2 retry | Textbelt free tier rate-limits to 1 SMS/day; second run within 24h returns "rate-limited" (the assertion accepts that wording). |
