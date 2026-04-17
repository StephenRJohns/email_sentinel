# emAIl Sentinel — E2E Playwright Tests

Automated end-to-end tests covering the full test plan. Runs in a headed Chrome window using your existing Google session — no password automation required.

---

## Setup

### 1. Install dependencies

```bash
cd test_plans/playwright
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

Optional sections (SMS, Chat, MCP) can be left blank to skip those tests.

---

## Running the tests

### Run all tests (required + optional)
```bash
npm test
```

### Run required sections only (skip optional 9–13)
```bash
npm run test:required
```

### Run a single section
```bash
npx playwright test --grep "S7"
```

### View the HTML report after a run
```bash
npm run report
```

---

## Test sections

| Sections | Description | Required |
|----------|-------------|----------|
| S2 | Initial settings setup & Gemini key | Yes |
| S3 | Starter rules | Yes |
| S4 | Create dedicated test rule | Yes |
| S5 | Baseline run | Yes |
| S6+S7 | Send test email and verify match | Yes |
| S8 | Activity log UI | Yes |
| S9 | SMS alert channel | Optional |
| S10 | Google Chat alert channel | Optional |
| S11 | Google Calendar alert channel | Optional |
| S12 | Google Sheets & Tasks alert channels | Optional |
| S13 | MCP server alert channel | Optional |
| S14 | Help card navigation | Yes |
| S15 | Start monitoring | Yes |
| S16 | Stop monitoring | Yes |
| S17 | Confirmation dialogs on destructive actions | Yes |
| S18 | Business hours gate | Yes |
| S19 | Max email age filter | Yes |

---

## Notes

- Tests run **headed** (visible browser window). Google blocks headless login attempts.
- The config file `e2e.config.env` is gitignored and will never be committed.
- On failure, screenshots and video are saved to `test-results/`.
- Gmail's add-on iframe selectors may occasionally need adjustment if Google updates its UI — check `helpers.js` if tests break after a Gmail update.
