# emAIl Sentinel — E2E Playwright Tests

Automated end-to-end tests for the reliably-passing portion of the test plan. Runs in a headed Chrome window using your existing Google session — no password automation required. Tests that depend on real email delivery, time-driven trigger state, multi-step modal workflows, or specific tier flips remain manual per `testing/e2e_test_plan.md`.

---

## Setup

### 1. Install dependencies

```bash
cd testing/playwright
npm install
npx playwright install chrome
```

### 2. Find your Chrome profile path

Open Chrome and go to `chrome://version`. Copy the value next to **Profile Path**.

### 3. Fill in the config file

```bash
# The config file is already created — just fill it in:
nano e2e.config.env   # or open in any editor
```

Set at minimum:
- `CHROME_PROFILE_PATH` — the path copied from chrome://version
- `GOOGLE_EMAIL` — your Gmail test account address
- `GEMINI_API_KEY` — from aistudio.google.com/app/apikey

---

## Running the tests

### Run all automated tests
```bash
./testing/run_free_e2e_tests.sh
```

### Run a single section
```bash
npx playwright test --grep "S2"
```

### View the HTML report after a run
```bash
npm run report
```

---

## Automated test coverage

| Section | Description | Tests |
|----------|-------------|-------|
| S2 | Home card, Settings nav, polling field validation (Free), max-age field presence | 7 |
| S3 | Starter rules preview + creation toast | 1 |
| S5 | "Scan email now" produces a result toast | 1 |
| S8 | Activity log UI, no-Home-button check | 2 |
| S14 | Help card navigation, footer credit, GitHub Issues link, keyword search | 5 |
| S18 | Business hours checkbox visibility | 1 |
| S19 | Max email age field persistence + validation | 3 |
| S20 | Free-plan home-card visibility (plan label, founding-member counter) | 2 |

**Total: 22 automated tests.**

---

## Manual-only sections

The following test plan sections are NOT automated. Verify these by hand against `testing/e2e_test_plan.md`:

| Section | Why manual |
|---------|------------|
| S2 Polling dropdown options | Verifying which hour options the dropdown offers per tier requires reading the rendered option list, which Apps Script SelectionInput doesn't expose to Playwright reliably (custom Material control, not native `<select>`). Manual on the test plan. |
| S4 Create test rule | Apps Script's FILLED-button rendering of "+ New rule" doesn't reliably expose the visible label as the accessible name in Playwright |
| S6+S7 Send + verify match | Real outbound email send and inbox delivery; flaky in automation |
| S9–S13 Alert channels | SMS/Chat/MCP/Calendar/Sheets/Tasks — would dispatch real alerts and burn provider credits |
| S15 Start monitoring | Depends on Gemini-key state and the time-driven trigger lifecycle |
| S16 Stop monitoring | Depends on S15 having run |
| S17 Confirmation dialogs | Multi-step Clear→Cancel→Clear→Clear sequences flake on toast detection |
| S20 Rule editor Pro-only labels / AI button "(Pro)" suffix | Same "+ New rule" rendering issue as S4 |
| S21 Pro plan unlocks | Tier-flip dependent; test cannot enforce the live tier |

---

## Tier selection

`run_pro_e2e_tests.sh` exports `TEST_TIER=pro`; `run_free_e2e_tests.sh` leaves it unset (treated as `free`). Most tests run in both modes. A small subset is gated:

- `test.skip(process.env.TEST_TIER === 'pro', ...)` — tests that assert Free-only UI (Free indicator, founding-member counter, "clamps to 180" toast). They are skipped on Pro runs.
- No Free-skipping tests yet; add `test.skip(process.env.TEST_TIER !== 'pro', ...)` if you ever introduce Pro-only assertions.

Before running the Pro wrapper, flip the live tier by running `setTierPro` from the Apps Script editor (in `LicenseManager.gs`); revert afterward with `setTierFree`. Both are no-arg wrappers around the underscore-private `setTier_(tier)` function (private helpers don't show up in the editor's function dropdown). The wrapper script prints a reminder, but doesn't enforce the flip — running the Pro suite without flipping the tier produces tier-mismatch failures.

---

## Notes

- Tests run **headed** (visible browser window). Google blocks headless login attempts.
- The config file `e2e.config.env` is gitignored and will never be committed.
- On failure, screenshots and video are saved to `test-results/`.
- Gmail's add-on iframe selectors may occasionally need adjustment if Google updates its UI — check `helpers.js` if tests break after a Gmail update.
