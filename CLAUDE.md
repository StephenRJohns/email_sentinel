# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**emAIl Sentinel** — a Google Workspace Gmail Add-on (Google Apps Script, V8 runtime) that watches Gmail labels for new messages, evaluates each one against user-defined plain-English rules using the Gemini REST API, and dispatches alerts via SMS, Google Chat, Calendar, Sheets, or Tasks.

There is no build step, no npm packages at runtime, no transpilation. Everything runs server-side on Google's infrastructure. The only local tooling is `clasp` for pushing files.

## Deploy / develop commands

```bash
# Install clasp once globally
npm install -g @google/clasp

# Authenticate
clasp login

# Push all .gs / .html / appsscript.json to the linked Apps Script project
clasp push

# Open the project in the Apps Script browser editor
clasp open

# Pull remote changes back to local (rarely needed)
clasp pull
```

The `scriptId` in `.clasp.json` links this directory to the live Apps Script project. Apps Script has no in-repo unit tests; manual testing is done by running functions from the Apps Script editor or triggering `runMailCheck()`.

## Architecture

### Data flow

```
Time-driven trigger (every 1/5/10/15/30 min)
  └─ runMailCheck()                          [MailWatcher.gs]
       ├─ loadSettings() / loadRules()       [SettingsManager.gs / RulesManager.gs]
       ├─ GmailApp.search() → new messages   [MailWatcher.gs]
       ├─ evaluateEmailAgainstRule()          [RuleEvaluator.gs]  ← Gemini REST call
       ├─ generateAlertMessage()             [RuleEvaluator.gs]  ← Gemini REST call
       └─ dispatchAlerts()                   [AlertDispatcher.gs]

Add-on UI (Google Cards) — all stateless, re-read UserProperties every render
  └─ onHomepage() / action handlers          [Code.gs → Cards.gs]
```

### State storage — UserProperties only

All persistent state lives in `PropertiesService.getUserProperties()` (per-user, per-script, private, 9 KB per value):

| Key | Contents |
|---|---|
| `mailsentinel.settings` | Gemini key/model, poll interval, business hours, all SMS provider credentials, alert channel IDs |
| `mailsentinel.rules` | JSON array of rule objects (see schema in RulesManager.gs header) |
| `mailsentinel.seen` | Per-label array of recently-seen Gmail message IDs (dedup baseline) |
| `mailsentinel.log` | Ring buffer of last ~60 activity log lines |

There is no database, no backend, no external storage.

### Key design constraints

**Apps Script execution limit:** Scripts time out at 6 minutes. `runMailCheck()` guards with `MAX_RUN_MS = 240000` (4 min) and `MAX_EVALS_PER_RUN = 100`. Messages that hit the limit have their IDs removed from `seen` so they are retried next run.

**9 KB UserProperties limit:** `saveRules()` throws a user-visible error if rules JSON exceeds 9 KB. `saveSeen_()` auto-shrinks the seen-ID buffer by trimming to 60% of current size until it fits.

**Log buffering:** During trigger runs, `startLogBuffering()` + `flushLog()` batch all `activityLog()` calls into a single UserProperties write. Call them at the start and end of any function that writes many log entries.

**Concurrency guard:** `runMailCheck()` takes `LockService.getUserLock()` with a 0ms timeout and skips the run if locked — prevents overlapping trigger fires.

**Cards are fully stateless:** Every card builder reads UserProperties fresh. Never cache state in global variables between card renders.

**Gemini via REST, not SDK:** `callGemini_()` uses `UrlFetchApp` + the user's own API key. No extra OAuth scope needed (only `script.external_request`).

**First-run baseline:** The first time `runMailCheck()` encounters a label, it records all current message IDs as the baseline (no alerts). Alerts only fire for messages that arrive after that baseline. This is intentional — don't change this behavior.

### All OAuth scopes are actively used

Every scope in `appsscript.json` is required:
- `gmail.addons.execute` — add-on execution
- `gmail.readonly` — `GmailApp.search()` and message reading
- `calendar` — `CalendarApp` in `sendCalendarAlert_()`
- `spreadsheets` — `SpreadsheetApp` in `sendSheetsAlert_()`
- `tasks` — Tasks REST API in `sendTasksAlert_()` (via `ScriptApp.getOAuthToken()`)
- `script.external_request` — `UrlFetchApp` for Gemini + all SMS providers
- `script.scriptapp` — `ScriptApp.newTrigger()` / `getProjectTriggers()`

### Email alerting is intentionally absent

We do not support email as an alerting channel. Alert channels are: SMS, Google Chat, Google Calendar, Google Sheets, Google Tasks, and MCP servers.

### SMS provider dispatch

`dispatchAlerts()` routes SMS through a function-dispatch table in `AlertDispatcher.gs`. Adding a new SMS provider means: adding the provider object to `SMS_PROVIDER_INFO`, adding the function name to `SMS_PROVIDERS`, and implementing `sendXxxSms_(toNumber, text, settings)`.

### License tiers

`LicenseManager.gs` defines `TIERS` (Free vs Pro) with per-tier limits:
`maxRules`, `minPollMinutes`, `allowChat`, `allowMcp`, `allowAiSuggest`,
`logRetentionDays`. Enforcement is in `handleSaveSettings` (poll floor),
`upsertRule` (rule count + Chat/MCP stripping), `handleSuggestRuleText` /
`handleSuggestAlertFormat` (Pro gate), and `buildRuleEditorCard` (UI hides
gated sections). Tier is persisted in `settings.license.tier`; for pre-launch
testing, run `setTier_('pro')` or `setTier_('free')` in the Apps Script
editor. Automatic entitlement sync with the Marketplace Subscription API
is a planned integration for the paid-tier launch.

### Founding-member lifetime offer

Launch-only $79 tier capped at the first 500 purchasers, codified in
`legal/TERMS.md` §6.1. `FOUNDING_MEMBERS_SOLD` and `FOUNDING_MEMBERS_LIMIT`
in `LicenseManager.gs` drive the scarcity counter on the home card. The
counter is bumped manually (or via the standalone monitor script in
`scripts/`); when it reaches 500 the UI hides the
offer and the developer manually pauses the SKU in Cloud Console.

### Branding

The app name is **emAIl Sentinel** — lowercase e, lowercase m, uppercase A, uppercase I (together: "AI"), lowercase l, space, uppercase S, lowercase entinel. This exact capitalization must be preserved everywhere.
