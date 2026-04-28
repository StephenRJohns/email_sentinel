# UserTesting Round 1 — Pre-flight setup

One-time setup work the developer does before submitting Round 1 to UserTesting. Each step has a time budget and a "validate before continuing" check. Run all four in order; don't pay for sessions until Step 3 (pre-flight self-test) passes.

Round-1 plan reference: `project_pre_launch_todo.md` (memory) and the locked plan at `~/.claude/plans/should-i-run-a-wondrous-hollerith.md`.

---

## Step 1 — Dedicated Gemini API key with a $5 billing cap (~10 min)

The point: you don't want a runaway tester loop draining your real Gemini budget, and you don't want the dev key tied to your primary email/billing account.

### 1a. Create a sandbox GCP project

1. Sign into **https://console.cloud.google.com/** with the Google account that owns the email_sentinel Apps Script project.
2. Top header → project picker dropdown → **New Project**.
3. Project name: `emailsentinel-usertesting-r1` (or similar). Leave organization default. **Create**.

### 1b. Set the budget cap before generating the key

1. Once the new project loads, hamburger menu → **Billing**. Link a billing account if it isn't already linked.
2. Hamburger → **Billing** → **Budgets & alerts** → **Create budget**.
3. Scope: this project only.
4. Amount: **$5** total budget (USD).
5. Threshold rules: check 50 %, 90 %, 100 % so you get email alerts as testers consume quota.

> ⚠ The budget alerts you, but does NOT auto-kill spending. To hard-cap, also reduce the daily quota: hamburger → **APIs & Services** → enable **Generative Language API** (Gemini) on this project → **Quotas** → set the daily request quota to **200 requests/day**. (10 testers × ~10 calls each = 100 calls; 200 gives headroom but caps a runaway loop.)

### 1c. Generate the API key

1. Open **https://aistudio.google.com/app/apikey** (the consumer-facing AI Studio).
2. Top right, click your account avatar, switch to the new project (`emailsentinel-usertesting-r1`).
3. **Create API key** → select your new sandbox project as the host.
4. Copy the key. Save it in your password manager labeled `UserTesting Round 1 — Gemini key — created <YYYY-MM-DD>`.

### 1d. Validate the key works

1. In emAIl Sentinel running on your dev account, open Settings → paste this key as a temporary test → **Test Gemini** → confirm the toast reads *"Gemini OK — model responded."*
2. **Replace your real dev key after the test** so the throwaway isn't sitting in your own settings.

---

## Step 2 — Marketplace SDK install URL (~2–3 hours, NOT 10 min)

> ⚠ **Correction over an earlier draft of this walkthrough.** The Apps Script Editor's "Test deployments" dialog only installs the add-on for the currently-signed-in (dev) account — it does NOT generate a public install URL the way Web App test deployments do. Workspace add-ons distribute exclusively through the Google Workspace Marketplace, so external testers need a Marketplace SDK install URL even for unverified pre-launch testing. This makes Step 2 substantially heavier than originally scoped.

The 2–3 hour setup is "free" pull-forward of pre-launch critical-path work — it has to happen for the public launch anyway. Walk through `docs/marketplace_checklist.txt` Parts 1–3 in order:

### 2a. Enable the Marketplace SDK

1. **https://console.cloud.google.com** → top bar → select the Cloud project linked to your Apps Script project. (Verify in the Apps Script editor → Project Settings → Google Cloud Platform (GCP) Project section if unsure.)
2. Hamburger → **APIs & Services** → **Library** → search "Google Workspace Marketplace SDK" → **Enable**.
3. Hamburger → **APIs & Services** → **Enabled APIs & services** → click **Google Workspace Marketplace SDK**. You'll use three tabs: OVERVIEW, APP CONFIGURATION, STORE LISTING.

### 2b. App Configuration tab

Paste in everything from `docs/marketplace_checklist.txt` Part 2:

- App name (must match OAuth consent screen exactly)
- Icon, banner, screenshots
- OAuth scopes (must match `appsscript.json`)
- Developer details
- ToS URL, Privacy URL
- Detailed description

### 2c. Store Listing tab

- Short description
- Category
- Regions: **United States only** (matches `legal/TERMS.md` §2)
- Languages: English

### 2d. OAuth consent screen — set publishing status to "In Production"

Hamburger → **APIs & Services** → **OAuth consent screen**. If publishing status is "Testing", click **Publish App** to move to "In Production". This allows external Google accounts to install (with the unverified-app warning) up to a 100-user lifetime cap until OAuth verification clears.

### 2e. Get the install URL

After saving the SDK draft (don't click "Publish to Marketplace" — that triggers Google's listing review on top of OAuth review), the SDK gives you a pre-publication install URL. Format and exact location of this URL varies with the current Cloud Console UI; verify by navigating Marketplace SDK → OVERVIEW or APP CONFIGURATION → look for "Install URL" or "Direct install link".

### 2f. Validate the URL works

1. On a different device or browser (Incognito, signed into a fresh non-dev Google account that is NOT in your Workspace org), paste the URL.
2. You should see Google's "unverified app" consent screen → **Continue** → **Allow**.
3. Reload Gmail. The emAIl Sentinel icon should appear in the right rail. Open it. Home card should load.
4. **If anything fails here, fix it before Round 1.** Testers cannot get past install issues you haven't already discovered.

### 2g. Skip-this-step alternative

If you don't have 2–3 hours for SDK setup right now, an acceptable temporary path is to share the Apps Script project as **Viewer** with each tester's Gmail address. They install via script.google.com. Trade-off: testers get source-code access. Acceptable for a small one-time UserTesting cohort, but the LICENSE-protected proprietary stance is weakened. If you take this path, **flip `email_sentinel` to private on GitHub first** (after the icon migration documented elsewhere) so the source the testers see is also the only source publicly visible.

---

## Step 3 — Pre-flight self-test on a fresh Google account (~30 min)

This is the most important step. You run both Scripts A and B against the deployed add-on as if you were a UserTesting tester, with a stopwatch.

### 3a. What you need

- A Google account that **isn't your dev account**. Easiest: create a free Gmail (`yourname-test+1@gmail.com` or similar) just for this. Or use a personal account separate from the dev one.
- A clean browser session signed into that account.
- A stopwatch (your phone is fine).
- A real US mobile phone for Script B's SMS test.

### 3b. Procedure (for each script in turn)

1. Open the script file fresh — read it through once before starting.
   - `usertesting/docs/script_a_core.md` (15-min target)
   - `usertesting/docs/script_b_power.md` (20-min target)
2. Start the stopwatch.
3. Run Task 1 → 2 → 3 → 4 → 5 in order, doing exactly what the script says. No shortcuts a real tester wouldn't take. Read each task aloud as if you were a UserTesting participant thinking out loud.
4. Note any moment of confusion, broken behavior, or dead-end. Even minor ones — a verbal "wait, what is this asking me to do?" is a finding worth fixing.
5. Stop the timer at the end of Task 5.

### 3c. Pass thresholds

| Script | Self-test target | If you go over |
|---|---|---|
| Script A (core) | ≤ 10 min as developer | Real testers will go ~50 % longer = > 15 min and may not finish. Trim Task 3 (rule writing) — it's the most variable. Consider pre-supplying a sample rule string in the script. |
| Script B (SMS) | ≤ 14 min as developer | Real testers ~21 min. Trim Task 2 (provider setup) by pre-supplying the recipient phone-number entry instructions more explicitly, or by skipping the country-code dropdown discussion if testers seem confused there. |

### 3d. Things to specifically spot-check during pre-flight

- Does the home card communicate "what is this product?" within 30 seconds of opening the add-on for the first time? (Script A Task 1 hinges on this.)
- Does the AI rule-suggestion button produce useful output for the example rule in Script A? (Click it, read the suggestion, ask: would a non-technical user accept this?)
- Does the country-code-dropdown + digits-only field in the SMS recipient editor make sense without instructions? (Script B Task 2.)
- Does the Textbelt free `textbelt` token actually deliver an SMS to your phone? Textbelt rate-limits to 1 SMS/day per IP — if your home IP is already used or blocked, find out *now*, not after paying for sessions.
- Does the unverified-app consent warning's wording match what's in your task scripts ("Continue → Allow")? Google occasionally tweaks the consent UI; if the buttons are renamed, update the scripts before submitting.
- After the alert fires, is the activity log line clear and reassuring to a non-technical tester? ("Calendar event created" is fine; "MCP alert sent to: …" is jargon.)

### 3e. Fix what you find before Step 4

Time budget: 30 min self-test + up to 60 min script trimming / minor add-on edits. If you find structural issues (e.g., the install flow is broken, Gemini key entry is unintuitive), it's better to fix and re-run pre-flight than to ship those issues to 10 paid sessions.

---

## Step 4 — Fill placeholders + submit Round 1 to UserTesting (~30 min)

### 4a. Fill placeholders

Both task scripts contain `<DEV_GEMINI_KEY>` and `<TEST_DEPLOYMENT_URL>` placeholders. Don't replace them in the repo — those values are per-round secrets and shouldn't end up in git history.

Instead:

1. Open each script file and copy its full text.
2. Paste into a temp file (`/tmp/script_a_filled.md`, `/tmp/script_b_filled.md`) OR paste directly into UserTesting's task editor.
3. In the temp/UserTesting copy, replace `<DEV_GEMINI_KEY>` with the key from Step 1 and `<TEST_DEPLOYMENT_URL>` with the URL from Step 2.
4. After the round closes (and definitely before Round 2), rotate the Gemini key (revoke old, generate new in the same sandbox project) and create a fresh test deployment URL — Round-1 testers shouldn't retain working access.

### 4b. Sign up for UserTesting

If you don't already have an account: **https://www.usertesting.com/** → sign up. Onboarding asks about your company / use case; free-text answers are fine.

### 4c. Configure Test 1 — Script A

1. Create a new test → **Unmoderated** / **Self-serve**.
2. Devices: **Desktop only** (the add-on is desktop Gmail).
3. Browser: any (Chrome and Firefox both work for Gmail).
4. Tester profile filters (paste from Script A's "Screener questions" section):
   - Heavy Gmail user (50+ emails/day)
   - One of: small business owner / freelancer / salesperson / real estate agent / paralegal / recruiter
   - US-based
   - Has installed a Gmail add-on or browser extension before, OR comfortable installing software when given a link
5. Tasks: paste Script A's 5 tasks, one per task field. Use the filled-in text from Step 4a.
6. Session count: **6 sessions**.
7. Submit.

### 4d. Configure Test 2 — Script B

1. New test → same Unmoderated / Self-serve / Desktop / any-browser config.
2. Tester profile filters (Script B has the same as A plus one more):
   - All four Script A filters
   - Has a US mobile phone they're willing to receive **one** test SMS at during the session
3. Tasks: paste Script B's 5 tasks (filled-in text from Step 4a).
4. Session count: **4 sessions**.
5. Submit.

### 4e. Pay

Roughly **$49 × 10 = $490** total. UserTesting charges per session at submission.

---

## Step 5 — When sessions return (1–2 weeks later)

UserTesting emails you when each session completes. Recordings come back gradually over 1–2 weeks; some testers are fast, some take days.

### 5a. Watch and note

```
cp usertesting/docs/triage_template.md usertesting/findings/round_1_$(date +%Y-%m-%d)_findings.md
```

Open the new findings file. Watch each recording at 1.5 × speed. Fill in the findings table as you go — one row per distinct issue, with verbatim quotes when possible.

### 5b. Group and fix

After all 10 sessions are watched, sort the findings table by severity (5+ testers = critical, 2–4 = important, 1 = backlog). Fix critical + important findings in priority order. Push fixes to the live test deployment (`clp`). Update the **Fix status** column in the findings file as each is shipped.

### 5c. Optional Round 2

After fixes ship, optionally run a smaller Round 2 (~5 sessions, ~$245, unmoderated) to verify the regressions are gone before Marketplace submission. Use the same scripts (no changes unless you also revised them based on Round 1 feedback) and a fresh sandbox-project Gemini key.

---

## Round-1 cost & time budget (locked)

| Item | Cost | Time |
|---|---|---|
| Step 1 — Sandbox GCP project + capped Gemini key | $0 (until tester usage; capped at $5) | ~10 min hands-on + hours/days waiting on Google's project-quota approval if your account hits that limit |
| Step 2 — Marketplace SDK setup + install URL | $0 | **~2–3 hours** (pull-forward of pre-launch critical-path work; the SDK has to be configured for public launch anyway) |
| Step 3 — Pre-flight self-test on fresh Google account | $0 | ~30 min + ≤60 min trim/fix |
| Step 4 — UserTesting account + Round 1 submission | ~$490 | ~30 min |
| Wait for sessions to come back | $0 | 1–2 weeks (your time: 0) |
| Step 5 — Triage + fix | $0 | ~3–4 hr review + 4–10 hr fixes |
| Optional Round 2 | ~$245 | ~2 hr review |
| **Total Round 1 only** | **~$490** | **~12–14 hr of dev time over ~3 weeks** |

Calendar runs in parallel with the OAuth-verification wait, so launch date isn't pushed. Step 2's Marketplace SDK setup also satisfies a launch requirement — you're not adding work to the launch path, just sequencing it earlier.
