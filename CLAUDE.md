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

The `scriptId` in `.clasp.json` links this directory to the live Apps Script project. The emAIl Sentinel Script ID is `1Cq_G1N935YKuuYe-5rViGnrHybrmgqJANwKUzlOzGP9UecGNyE07ssrR`. Apps Script has no in-repo unit tests; manual testing is done by running functions from the Apps Script editor or triggering `runMailCheck()`.

## Architecture

### Data flow

```
Time-driven trigger (everyMinutes() in {1, 5, 10, 15, 30}, chosen to divide pollMinutes)
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

**Polling grid (Workspace add-on trigger constraint):** Gmail/Workspace add-on time-based triggers must fire no more often than once per hour — this is a Google platform constraint, not an Apps Script `everyMinutes()` quirk, and there is no add-on-level workaround. The 60-minute floor applies to every plan. Tier policy on top of that floor: `free.minPollMinutes = 180` (every 3 hours), `pro.minPollMinutes = 60` (every 1 hour, the platform floor itself). `enforcePollFloor()` snaps `pollMinutes` up to the nearest multiple of 60 and clamps to the active tier's minimum. `installTrigger()` uses `everyHours(round(pollMinutes / 60))`. `runMailCheck()` still applies a `LAST_RUN_KEY` elapsed-time skip-check so longer-than-hourly cadences (e.g. 240, 360) are precise. `runMailCheck({force: true})` bypasses the skip-check for manual "Scan email now" — that button is how users get sub-hour responsiveness on demand on any plan.

**Cards are fully stateless:** Every card builder reads UserProperties fresh. Never cache state in global variables between card renders.

**No back-arrow event in CardService:** Google's add-on framework does not emit an event when the user taps the system back arrow at the top-left of a card. Editor cards therefore cannot show a "discard unsaved changes?" confirmation dialog — pressing back instantly pops the navigation stack and the in-flight form values are dropped. The mitigation is `buildUnsavedChangesNotice_()` in `Cards.gs`, which is the first section on every editor card (rule editor, settings, MCP server editor, SMS recipient editor, chat space editor) and warns the user to click Save before navigating back. If a future iteration wants real protection, the next step would be a draft-persistence layer keyed on form-input `setOnChangeAction` (which fires on blur, not on every keystroke, and is not available on plain `TextInput` for typing-time auto-save).

**Universal-action navigation has no native back arrow; Home button is conditional:** Sub-cards reached via the kebab "⋮" menu items in `appsscript.json universalActions` (Rules, Settings, Activity Log, Help) use `UniversalActionResponseBuilder.displayAddOnCards`, which *replaces* the navigation stack rather than pushing onto it. Gmail therefore does not render its native back arrow on those cards, leaving the user no way out. To handle that, every sub-card builder (`buildRulesCard`, `buildSettingsCard`, `buildHelpCard`, `buildActivityCard`, `buildStarterRulesCard`) accepts an optional `viaPush` flag and prepends `buildHomeButtonSection_()` only when the flag is *not* set. The push path (`handleNavTo`, called by the home-card buttons) sets `viaPush=true` because it knows the resulting stack will have at least the home card underneath, guaranteeing the back arrow — so no in-card Home is needed. Universal-action handlers in `Code.gs`, `popToRoot().updateCard(...)` returns, and other call sites omit the flag, so the Home button shows. CardService doesn't expose the live back-arrow visibility to the server, so `popCard().updateCard(...)` paths may produce a redundant Home button when the underlying stack happens to still have the home card below; that's accepted as visual noise rather than a trapping risk. `handleGoHome` does `popToRoot().updateCard(buildHomeCard())` which is correct for both stacked and replaced navigation. Universal-action responses also do *not* support `setNotification` toasts, so `actionRunCheckNow` returns a dedicated `buildScanResultCard_()` (green ✅ or red ⚠ banner) instead of relying on a transient toast for visible feedback after a manual scan.

**All user-visible dates are localized via `formatLocalDateTime_` (`Code.gs`):** `Date.toISOString()` produces UTC/Zulu strings like `2026-04-27T22:29:58.636Z` which are confusing to non-UTC users. `formatLocalDateTime_(d)` uses `Utilities.formatDate(d, getUserTimeZone_(), 'yyyy-MM-dd h:mm:ss a z')` to emit `2026-04-27 5:29:58 PM CDT`. `getUserTimeZone_()` prefers `CalendarApp.getDefaultCalendar().getTimeZone()` (matches what Gmail/Calendar display in their UI), falling back to `Session.getScriptTimeZone()`, and is cached in a module-level `_cachedUserTz_` so a single trigger run that writes dozens of activity-log entries doesn't pay the CalendarApp round-trip per entry (Apps Script preserves module state for one execution, exactly the cache scope we want). `MailWatcher.gs:gatherMessage_` pre-formats `receivedDateTime` so all downstream presentation contexts (Calendar event descriptions, Tasks notes, Sheets rows, the Gemini evaluation prompt, and the alert text Gemini generates) inherit the localized format. `receivedMillis` (raw epoch) is kept alongside for any code that needs sortable/comparable timestamps. The activity-log timestamp prefix is also localized in 12-hour AM/PM (`yyyy-MM-dd h:mm:ss a`); the `buildActivityCard` bolding splits on the literal double-space separator between stamp and message rather than a fixed offset (older 24-hour entries still in the 60-line ring buffer continue to render correctly during rollover). New code that surfaces a date to the user should use `formatLocalDateTime_` rather than calling `.toISOString()` or `.toString()`.

**MCP Streamable HTTP responses can be SSE; tool-level errors are inside `result.isError`:** `sendMcpAlert_` in `McpServers.gs` POSTs JSON-RPC `tools/call` to the MCP server and the response can come back with `Content-Type: application/json` (single JSON object) *or* `Content-Type: text/event-stream` (one or more SSE message events whose `data:` lines hold the JSON-RPC response). Asana's V2 MCP at `https://mcp.asana.com/v2/mcp` returns SSE in practice. The handler detects `text/event-stream` in the response Content-Type header and reassembles `data:`-prefixed lines into a JSON string before parsing — without that, `JSON.parse` throws on the SSE body, the catch block swallows it as a "non-JSON ack", and the dispatcher logs a misleading `MCP alert sent to: <name>` even when the tool actually failed. Three error tiers must all be checked: (1) HTTP non-2xx → `'MCP "<name>" HTTP <code>: <body>'`; (2) JSON-RPC envelope error at `body.error` → `'MCP "<name>" error: <body.error>'`; (3) tool-level error at `body.result.isError === true` with detail in `body.result.content[].text` → `'MCP "<name>" tool error: <detail>'`. New MCP server presets in `MCP_TYPE_DEFAULTS` should not skip these checks.

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
`logRetentionDays`. Enforcement is layered: `handleNewRule` (early gate at
"+ New rule" click — checks `canAddRule()` before opening the editor so the
user doesn't fill out a rule that won't save), `upsertRule` (defense-in-depth
rule count + Chat/MCP stripping at save time, also covers programmatic save
paths that bypass the UI), `handleSaveSettings` (poll floor — now mostly
unreachable from the dropdown UI but kept as defense-in-depth),
`handleHelpWriteRuleText` / `handleHelpWriteAlertText` (Pro gate for AI rule
writing), and `buildRuleEditorCard` (UI hides gated channel sections). Tier is persisted in `settings.license.tier`; for pre-launch
testing, select `setTierPro` or `setTierFree` from the Apps Script editor's
function dropdown (in `LicenseManager.gs`) and click Run. These are no-arg
wrappers around the underscore-private `setTier_(tier)` helper. Automatic
entitlement sync with the Marketplace Subscription API is a planned
integration for the paid-tier launch.

### Founding-member lifetime offer

Launch-only $79 tier capped at the first 500 purchasers, codified in
`legal/TERMS.md` §6.1. `FOUNDING_MEMBERS_SOLD` and `FOUNDING_MEMBERS_LIMIT`
in `LicenseManager.gs` drive the scarcity counter on the home card. The
counter is bumped manually (or via the standalone monitor script in
`scripts/`); when it reaches 500 the UI hides the
offer and the developer manually pauses the SKU in Cloud Console.

### Branding

The app name is **emAIl Sentinel** — lowercase e, lowercase m, uppercase A, uppercase I (together: "AI"), lowercase l, space, uppercase S, lowercase entinel. This exact capitalization must be preserved everywhere.
