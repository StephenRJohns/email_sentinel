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

**Apps Script execution limit:** Scripts time out at 6 minutes. `runMailCheck()` guards with `MAX_RUN_MS = 180000` (3 min) and `MAX_EVALS_PER_RUN = 100`. The 3-min cap leaves comfortable headroom — at 4 min, an in-flight Gemini call (with the 5 s 503 retry) plus a per-match alert-format Gemini call plus Calendar/Sheets dispatch could collectively overshoot the 6-min hard kill before the top-of-loop guard next ran. Messages that hit the limit have their IDs removed from `seen` so they are retried next run.

**9 KB UserProperties limit:** `saveRules()` throws a user-visible error if rules JSON exceeds 9 KB. `saveSeen_()` auto-shrinks the seen-ID buffer by trimming to 60% of current size until it fits.

**Log buffering:** During trigger runs, `startLogBuffering()` + `flushLog()` batch all `activityLog()` calls into a single UserProperties write. Call them at the start and end of any function that writes many log entries.

**Concurrency guard:** `runMailCheck()` takes `LockService.getUserLock()` with a 0ms timeout and skips the run if locked — prevents overlapping trigger fires.

**Polling grid (Workspace add-on trigger constraint):** Gmail/Workspace add-on time-based triggers must fire no more often than once per hour — this is a Google platform constraint, not an Apps Script `everyMinutes()` quirk, and there is no add-on-level workaround. The 60-minute floor applies to every plan. Tier policy on top of that floor: `free.minPollMinutes = 180` (every 3 hours), `pro.minPollMinutes = 60` (every 1 hour, the platform floor itself). `enforcePollFloor()` snaps `pollMinutes` up to the nearest multiple of 60 and clamps to the active tier's minimum. `installTrigger()` uses `everyHours(round(pollMinutes / 60))`. `runMailCheck()` still applies a `LAST_RUN_KEY` elapsed-time skip-check so longer-than-hourly cadences (e.g. 240, 360) are precise. `runMailCheck({force: true})` bypasses the skip-check for manual "Scan email now" — that button is how users get sub-hour responsiveness on demand on any plan.

**Cards are fully stateless:** Every card builder reads UserProperties fresh. Never cache state in global variables between card renders.

**No back-arrow event in CardService:** Google's add-on framework does not emit an event when the user taps the system back arrow at the top-left of a card. Editor cards therefore cannot show a "discard unsaved changes?" confirmation dialog — pressing back instantly pops the navigation stack and the in-flight form values are dropped. The mitigation is `buildUnsavedChangesNotice_()` in `Cards.gs`, which is the first section on every editor card (rule editor, settings, MCP server editor, SMS recipient editor, chat space editor) and warns the user to click Save before navigating back. If a future iteration wants real protection, the next step would be a draft-persistence layer keyed on form-input `setOnChangeAction` (which fires on blur, not on every keystroke, and is not available on plain `TextInput` for typing-time auto-save).

**Action color conventions on FILLED buttons:** Cards.gs defines four brand color constants used to distinguish button intent. `BRAND_PURPLE_` (`#581c87`) is the primary brand color and the default for non-destructive FILLED CTAs (Save, Generate, + New rule, Start scheduled scans). `BRAND_PURPLE_LIGHT_` (`#7c3aed`) is the secondary FILLED CTA on cards that already have a primary purple button — used for "Scan email now" so it's visually distinct from "Start scheduled scans" sitting beside it. `BRAND_RED_` (`#c62828`) marks every Delete button in the UI (rule list Delete, MCP/SMS/Chat editor Delete buttons, and all four corresponding confirmation Delete buttons). `BRAND_YELLOW_LIGHT_` (`#fde68a`) marks the rule toggle when the rule is currently enabled and the button reads "Disable" — a soft warning that this action turns off something currently working. When the button reads "Enable" (rule is OFF), the toggle uses default plain-text style because enabling isn't a cautionary action. Text color is wrapped explicitly via `whiteText_()` for dark backgrounds (purple, red) and `blackText_()` for light backgrounds (yellow); CardService doesn't auto-pick text color reliably for FILLED buttons with custom backgrounds. New action buttons should be classified into one of these four categories rather than introducing new brand colors.

**Home polling dropdown auto-saves on change via `setOnChangeAction`:** The home card's "Scan email every" dropdown (only visible when scheduled scans are stopped) wires `setOnChangeAction(action_('handleHomePollChange'))` so the picked value is persisted to `settings.pollMinutes` the moment the user changes the selection — they do not need to click "Start scheduled scans" for the choice to stick. Without this, the user could pick "2 hours" on the home card, navigate to Settings via the kebab menu, and find the old value still selected (because CardService doesn't auto-submit form inputs when the user navigates away from a card; only an explicit action button submits them). `handleHomePollChange` is intentionally silent — it returns an empty `ActionResponseBuilder` (no notification, no card update) so picking a value just sticks without any UI flicker. `handleStartMonitoring` also re-reads and re-saves the value as defense-in-depth (idempotent — same chosen value, same save). The trick works for `SelectionInput` because its `onChangeAction` fires immediately when a new option is picked; the same pattern wouldn't work for `TextInput` (onChangeAction fires only on blur and only on TextInput types that support it, which excludes the plain typing-time auto-save we'd want for an editor draft).

**Universal-action navigation has no native back arrow; the four root cards prepend an in-card Home button as the escape hatch:** Sub-cards reached via the kebab "⋮" menu items in `appsscript.json universalActions` (Rules, Settings, Activity Log, Help) use `UniversalActionResponseBuilder.displayAddOnCards`, which *replaces* the navigation stack rather than pushing onto it. Gmail therefore does not render its native back arrow on those cards. Likewise, every confirm-delete handler (`handleConfirmDeleteRule`, `handleConfirmClearLog`, `handleConfirmDeleteMcpServer`, `handleConfirmDeleteSmsRecipient`, `handleConfirmDeleteChatSpace`, and the starter-rules creation handler) does `popToRoot().updateCard(buildXxxCard())` to dismiss the confirmation sub-card, which leaves the root card with no back arrow either. To give users a reliable way back to home on those paths, `buildRulesCard`, `buildSettingsCard`, `buildActivityCard`, and `buildHelpCard` all prepend `homeButtonSection_()` (a single Home button wired to `handleGoHome`) as their first section. It's prepended *unconditionally* rather than conditioned on a flag because Apps Script doesn't expose navigation-stack depth at handler time — we'd have no way to reliably re-add the Home button on subsequent `updateCard` calls (rule toggle, log refresh, settings save) where the back-arrow state hasn't changed but the card is being re-rendered. When the back arrow is also visible (push-card path from the home card buttons) this is mild redundancy: the back arrow goes one card up, the Home button jumps to root. `handleGoHome` does `popToRoot().updateCard(buildHomeCard())` which is correct for both stacked and replaced navigation. Universal-action responses do *not* support `setNotification` toasts, so manual scans land on `buildScanResultCard_()` (green ✅ or red ⚠ banner) for visible feedback.

**"Scan email now" universal action lands on a pre-scan card, not the result card:** Universal-action responses cannot show a load indicator (no button to attach a spinner to), and empirical testing confirmed there is no platform-level loading feedback either — calling `runMailCheck()` directly inside `actionRunCheckNow` blocks 10–60 seconds with the panel completely silent and feels broken. Instead `actionRunCheckNow` returns `buildPreScanCard_()` — a card explaining the scan with a single "Run scan now" button. The button's action handler is `handleRunCheckNow` which calls `runMailCheck()` and pushes `buildScanResultCard_()` on completion; CardService renders the default spinner on the button while the action runs. The home card's "Scan email now" button bypasses the pre-scan card and hits `handleRunCheckNow` directly because it is already a button click and gets the spinner naturally. Do not "simplify" by removing the pre-scan card — this has been tried and reverted.

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

We do not support email as an alerting channel. Alert channels are: SMS, Google Chat, Google Calendar, Google Sheets, Google Tasks, and External integrations (MCP servers + Asana REST). The Settings section is labeled "External integrations" rather than "MCP server alerts" because the Asana REST option is direct REST, not MCP — the broader umbrella is more honest. The MCP type dropdown lists Custom (recommended starting point — Help has a Cloudflare Worker walkthrough), Microsoft Teams (renamed from "Microsoft 365" since Teams is the actual surface), Asana (REST API), and Asana (MCP V2 — requires OAuth). Slack was removed from the dropdown because Slack does not host an MCP server and the type was misleading; users wanting Slack alerts self-host an MCP-to-Slack bridge and pick Custom. Legacy stored types `slack` and `ms365` migrate at editor-render time (slack→custom, ms365→teams) so existing user configs survive.

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

### Screenshot mode

`ScreenshotMode.gs` exposes a developer-only toggle (`setScreenshotModeOn` /
`setScreenshotModeOff` from the Apps Script editor's function dropdown) that
substitutes safe demo PII into outgoing alerts and on the recipient-display
surfaces so Marketplace screenshots don't leak real names, phone numbers, or
email addresses. State persists in `settings.screenshotMode`.

When ON:
- `emailData.from` is rewritten to `Tester <test@example.com>` before
  `generateAlertMessage` is called (so the Gemini-generated alert text uses
  the fake sender) and before `dispatchAlerts` (so Calendar / Sheets / Tasks
  descriptions get it too).
- `emailData.subject` and `emailData.body` are run through
  `scrubScreenshotPii_`, which applies a user-defined substring redaction
  list before they reach Gemini.
- The SMS dispatch recipient is overridden to `+12105551212`.
- The Settings-card SMS recipients list and the Rule-editor SMS multi-select
  display `Tester` for each name and `+12105551212` for each number, via
  `applyScreenshotName_` / `applyScreenshotPhone_`.
- `MailWatcher.gs` activity log line uses the same overridden values.

**Real developer PII never enters source code.** The redaction pair list
(real → demo) lives in UserProperties under
`mailsentinel.screenshotRedactions` and is configured at runtime via
`setScreenshotRedaction(real, demo)`. The Apps Script editor's "Run" button
can't pass arguments, so use the local stub `configureMyScreenshotRedactions`:
edit it locally to add your `setScreenshotRedaction(...)` calls, run once
from the editor, then **revert the stub body to empty before committing**.
The values are now in UserProperties (private, per-user) and persist across
deploys until cleared via `clearScreenshotRedactions()`. `listScreenshotRedactions()`
returns the in-memory list and logs only the count to Logger — never the
values themselves, so the activity log and Stackdriver logs remain
PII-free even when redactions are configured. The hardcoded demo values
(`Tester`, `test@example.com`, `+12105551212`) are fictional — `555-1212` is
the standard demonstration suffix in the North American Numbering Plan.

### Founding-member lifetime offer

Launch-only $79 tier capped at the first 500 purchasers, codified in
`legal/TERMS.md` §6.1. `FOUNDING_MEMBERS_SOLD` and `FOUNDING_MEMBERS_LIMIT`
in `LicenseManager.gs` drive the scarcity counter on the home card. The
counter is bumped manually (or via the standalone monitor script in
`scripts/`); when it reaches 500 the UI hides the
offer and the developer manually pauses the SKU in Cloud Console.

### Branding

The app name is **emAIl Sentinel** — lowercase e, lowercase m, uppercase A, uppercase I (together: "AI"), lowercase l, space, uppercase S, lowercase entinel. This exact capitalization must be preserved everywhere.
