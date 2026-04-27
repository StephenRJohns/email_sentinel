# emAIl Sentinel — Testing

This directory holds the end-to-end test plan and the tooling to run it.

| Path | Purpose |
|---|---|
| `e2e_test_plan.md` | Canonical checklist of every required and optional E2E flow. |
| `playwright/` | Playwright project that automates the non-SMS-sending steps. |
| `run_free_e2e_tests.sh` | Launcher for the Free-tier Playwright suite. |
| `run_pro_e2e_tests.sh` | Wrapper that sets `TEST_TIER=pro` and delegates to the Free launcher. |
| `reset_e2e_chrome.sh` | Wipes the dedicated E2E Chrome profile and kills any related processes. |
| `test_runs/` | Archived, annotated copies of the plan, one per run (auto-created). |
| `.last_run_results.json` | JSON reporter output from the most recent run (gitignored). |

---

## Running the E2E suite

The automated suite covers ~20 reliably-passing tests (S2 polling validation, S3 starter rules preview, S5 Run-check-now toast, S8 activity log UI, S14 Help card, S18 business hours visibility, S19 max-email-age validation, S20 home-card visibility). The rest of the test plan is manual.

```bash
./run_free_e2e_tests.sh                         # run automated suite
./run_free_e2e_tests.sh --grep "S2"             # single section; any args pass through to Playwright
```

`run_pro_e2e_tests.sh` exists for legacy reasons — currently the suite runs the same set regardless of `TEST_TIER`. If you re-add Pro-specific assertions later, flip the live tier first by running **`setTierPro`** in `LicenseManager.gs` from the Apps Script editor, and revert with **`setTierFree`** when done.

See `playwright/README.md` for the full list of automated tests and the manual-only sections (S4, S6+S7, S9–S13, S15–S17, S20 rule editor, S21).

The script is fully self-contained:

1. If Chrome isn't already running on port 9222, it launches it automatically using the E2E profile from `e2e.config.env` and waits for it to be ready.
2. If Chrome is already on port 9222 (e.g. from a previous run in the same session), it reuses it.
3. Playwright connects over CDP — no automation flags, no Google bot-detection block.
4. After tests finish, produces the annotated `test_runs/` report automatically.

Leave the Chrome window alone while tests are running.

### Resetting the E2E Chrome profile

If Chrome keeps refreshing during first-run sign-in, if the launcher reports *"Chrome did not respond on port 9222"*, or if you want to sign in with a different Google account, run:

```bash
./reset_e2e_chrome.sh
```

It kills every Chrome process tied to the dedicated E2E user-data-dir and deletes `~/.cache/email_sentinel_e2e_chrome/`. The next launcher run will be treated as a first run and prompt you to sign in again. Your daily Chrome and its profiles are untouched — this only operates on the isolated E2E dir.

### Prerequisites

Fill in `playwright/e2e.config.env` before the first run:

- `CHROME_PROFILE_PATH` — see the dedicated-profile setup below.
- `GOOGLE_EMAIL` — Gmail test account (must match the account signed into the profile above).
- `GEMINI_API_KEY` — from aistudio.google.com/app/apikey.

SMS / Chat / MCP credential fields are optional; leave blank to skip those sections.

#### Dedicated Chrome profile (required — Google blocks automation in fresh Chrome)

Playwright uses `launchPersistentContext` to inherit a real Chrome profile's cookies. That profile must be signed into Gmail *in a normal Chrome window* before any test run — Google silently blocks sign-in attempts inside Playwright-driven Chrome.

One-time setup:

1. In your regular Chrome, click the profile avatar → **Add** → create a new profile (e.g. "emAIl Sentinel E2E"). Skip the "Sign in to Chrome" dialog — it's optional and not what we need.
2. In the new profile, open a regular tab, go to `https://mail.google.com`, and sign in via Gmail's webpage login form.
3. Once you see the inbox, the cookie is saved. Visit `chrome://version` in that profile and copy the **Profile Path** value.
4. Paste that path into `CHROME_PROFILE_PATH` in `playwright/e2e.config.env`.
5. Install the add-on on that account (clasp push + test deployment, or manual paste).

**Every test run requirement:** close any Chrome window that's using that profile before launching tests. Chrome locks the profile while a window has it open, and Playwright will silently fail to attach or launch a fresh fingerprint that Google blocks again. Your *other* Chrome profiles (daily driver, etc.) can stay open — profile locks are independent.

### Outputs

- `.last_run_results.json` — Playwright JSON reporter output. Consumed by the archival step to decide pass/fail per checkbox.
- `playwright/playwright-report/index.html` — HTML report (`cd playwright && npm run report` to open).
- `playwright/test-results/` — screenshots + video for failures.

### SMS sends are manual-only

Automation never clicks **Send test SMS** and never wires a real SMS recipient onto a rule that runs through **Scan email now** — that would burn provider credits and spam phones. Section 9 of `e2e_test_plan.md` is executed by hand.

### Tier selection

The current automated suite runs the same set regardless of `TEST_TIER`. Pro-specific assertions are manual-only (see `playwright/README.md`). If you re-add tier-gated tests in the future, flip the live tier with **`setTierPro`** / **`setTierFree`** in the Apps Script editor (`LicenseManager.gs`) to match `TEST_TIER`.

---

## Post-run archival

After every Playwright run, an annotated copy of `e2e_test_plan.md` is dropped into `test_runs/` with the filename:

```
test_runs/<YYYY-MM-DD> <HH:MM:SS>_e2e_test_run.md
```

(Timestamp is the run's completion time; `_plan` in the source filename becomes `_run` in the archive.)

Each checkbox is marked from the JSON results:

- Passed: `- [✅] …`
- Failed: `- [❌] …` followed by a new line with the error, wrapped in `<span style="color:darkred">…</span>`.
- Untested / skipped optional items stay as `- [ ]`.

When a single Playwright failure covers multiple plan checkboxes, all affected checkboxes are marked failed with the same error description.
