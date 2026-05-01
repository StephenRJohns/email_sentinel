# emAIl Sentinel — End-to-End Test Plan · Issue #10

Complete every item in order. All items in Sections 1–8, 14–20, and 22 are required.
Sections 9–13 are optional alert-channel tests. Section 21 is required only when testing Pro-tier features.

**Automation vs. manual scope.** Steps in this plan that would send a real SMS are manual-only — the Playwright suite in `testing/playwright/` intentionally skips any action that dispatches an actual text message (see Section 9 and the SMS-allowed bullet in Section 20). All other required steps are automated.

---

## 1 · Prerequisites

*Confirm these are in place before opening Gmail.*

- [ ] Google account with Gmail access.
- [ ] Gemini API key obtained from aistudio.google.com/app/apikey (free, no credit card required).
- [ ] Add-on installed — either via "clasp push + Test deployments → Install" or by pasting source files manually in script.google.com.
- [ ] Gmail is open in a browser tab and the emAIl Sentinel icon is visible in the right-hand add-on rail.
- [ ] **(Optional, for a clean run)** In the Apps Script editor, run `resetUserPropertiesForTesting()` (defined in `Code.gs`) to clear all settings, rules, seen-IDs, and activity log. The Logger should output: `All user properties cleared — add-on is in pristine first-use state.` Reload the add-on card after running.

---

## 2 · Initial Settings Setup

*Open the add-on, configure the Gemini key, and verify the connection.*

- [ ] Click the emAIl Sentinel icon in the Gmail add-on rail.
- [ ] Home card loads. Status row shows: Plan = "Free (0/3 rules)", Scanning = "Stopped", Gemini API key = "NOT configured".
- [ ] An "Upgrade to Pro" button is visible on the home card for Free users.
- [ ] Quick setup checklist is visible on the home card with grouped structure: a top-level "- Open Settings" bullet followed by indented sub-bullets "- Paste your Gemini API key" and "- Set up alert channels", plus top-level bullets for creating a rule and starting monitoring.
- [ ] Click Settings (either via the universal action "⋮" menu or the Settings nav button).
- [ ] Paste your Gemini API key into the "Gemini API key" field. The aistudio.google.com/app/apikey URL is a tappable link.
- [ ] Confirm model is "gemini-2.5-flash" (default).
- [ ] Scan-schedule field is a dropdown titled "Scan email every" with whole-hour options. **Free tier:** options are `3 hours / 4 hours / 6 hours / 8 hours / 12 hours / 24 hours`. **Pro tier:** options are `1 hour / 2 hours / 3 hours / 4 hours / 6 hours / 8 hours / 12 hours / 24 hours`. Below the dropdown, a grey hint paragraph explains the tier minimum and that the 60-minute limit is a Google Workspace add-on platform limit.
- [ ] **Free — pick a value at or above tier min.** Select `4 hours`. Save → toast: "Settings saved." Reload Settings — dropdown shows `4 hours`.
- [ ] **Pro — pick the platform floor.** Select `1 hour`. Save → toast: "Settings saved." Reload Settings — dropdown shows `1 hour`.
- [ ] **Activity log on scheduled-scan start.** With the home-card "Scan email every" dropdown set to `2 hours` (Pro), click Start scheduled scans → activity log records "Installed time-driven trigger: every 2 hours." With `1 hour` (Pro), logs "every 1 hour." With `3 hours` (Free), logs "every 3 hours."
- [ ] Confirm "Only scan emails newer than (days)" field is present and defaults to 30.
- [ ] Click "Save settings". Toast notification reads: "Settings saved."
- [ ] Click "Test Gemini". Toast reads: "Gemini OK — model responded."
- [ ] Navigate back to Home card. Gemini API key row now shows "Configured". In the Quick setup checklist, the "Paste your Gemini API key" sub-bullet now shows a ✓.

---

## 3 · Starter Rules

*Create the five built-in rules from the home card shortcut.*

- [ ] From the home card, click "Starter rules".
- [ ] Preview card shows 5 starter rules (Urgent emails, Invoices & payment requests, Shipping & delivery updates, Security & account alerts, Bills & subscription renewals).
- [ ] Click "Create starter rules".
- [ ] **Free tier:** toast reads "3 starter rules created (disabled). Edit each to add alert recipients and enable. 2 skipped (Free plan limit reached — upgrade to Pro for unlimited rules)." — only the first 3 starter rules get created (Urgent, Invoices, Shipping). Rules row shows "0 enabled / 3 total".
- [ ] **Pro tier (if testing on Pro):** toast reads "5 starter rules created (disabled)." All 5 rules created. Rules row shows "0 enabled / 5 total".
- [ ] Rules card opens. Created rules are listed with OFF status.

---

## 4 · Create a Dedicated Test Rule

*Create a simple, uniquely-named rule to verify evaluation without triggering real alerts.*

- [ ] Click Rules → "+ New rule".
- [ ] Rule name field: enter `Test rule — E2E`
- [ ] Gmail labels field: enter `INBOX`
- [ ] Rule text field (titled "Rule text (plain English)"): enter `Any email with SENTINEL_TEST anywhere in the subject line.`
- [ ] Alert message content (titled "Alert message content (plain English)"): leave as default.
- [ ] Leave all alert channel checkboxes unchecked for now (SMS, MCP servers, Google Chat, Calendar, Sheets, Tasks).
- [ ] Click "Save". Toast reads: "Rule saved, but no alert channels configured. Edit the rule to add at least one."
- [ ] Rule appears in the Rules list as ON (enabled by default).

---

## 5 · Baseline Run (Before Test Email)

*Establish the seen-message baseline so the next run detects exactly the new test email.*

- [ ] From the home card, click "Scan email now".
- [ ] Toast shows check result (typically "0 new emails, 0 matches" or baseline messages).
- [ ] Click "Activity log". Newest entry is the manual check.
- [ ] INBOX entry shows either "baseline set (N existing messages). Watching for new mail." or "no new messages."
- [ ] No MATCH lines appear in the log.

---

## 6 · Send the Test Email

*Trigger a real match by sending a precisely-worded email to your own inbox.*

- [ ] Open Gmail Compose (in a different tab or window).
- [ ] To: your own Gmail address.
- [ ] Subject: exactly `SENTINEL_TEST — please ignore`
- [ ] Body: anything (or leave blank).
- [ ] Send the email.
- [ ] Wait ~30 seconds, then confirm the email appears in your Gmail INBOX.

---

## 7 · Run Check After Test Email

*Verify Gemini evaluates the email and the activity log records a match.*

- [ ] From the home card, click "Scan email now".
- [ ] Toast shows: "Check complete: 1 new email, 1 match." (numbers and pluralization vary with actual counts — `0 new emails, 0 matches`, `1 new email, 1 match`, `2 new emails, 2 matches` etc.).
- [ ] Click "Activity log".
- [ ] Log shows: Label "INBOX": 1 new message.
- [ ] Log shows: From: [your address] | Subject: SENTINEL_TEST…
- [ ] Log shows: Evaluating against rule "Test rule — E2E" …
- [ ] Log shows: MATCH! [brief Gemini reason]
- [ ] No SMS / Chat / Calendar / Sheets / Task / MCP entries appear (no channels were configured).

---

## 8 · Activity Log UI

*Verify the log controls and timestamp formatting work correctly.*

- [ ] Activity log displays entries newest-first.
- [ ] **Entry formatting.** Each entry's timestamp prefix is bold and rendered in 12-hour AM/PM in the user's local timezone — `yyyy-MM-dd h:mm:ss a` (e.g. `2026-04-27 5:29:58 PM`). Entries are separated by a blank line for readability. The bolding uses the literal double-space separator between stamp and message, so any older 24-hour entries still in the 60-line ring buffer also bold correctly during rollover.
- [ ] **Local timezone consistency.** Compare an activity-log timestamp to the **Timestamp** column of the same alert's Sheets row (Section 12) and the date in the Calendar event description (Section 11). All three should show the same local-timezone wall-clock time within seconds of each other. If they disagree, the user's primary Calendar timezone is wrong — fix it in [calendar.google.com](https://calendar.google.com/calendar/u/0/r/settings) ▸ Time zone.
- [ ] "Refresh" button reloads the log without navigating away.
- [ ] If log has more than 20 entries, "Show older (N more)" button appears and loads additional entries.

---

## 9 · SMS Alert Channel Test

*Optional — requires an SMS provider. Recipients are named contacts managed via add/edit/delete cards in Settings.*

> **Manual-only section.** Every step in this section is performed by the tester by hand. The Playwright automation suite intentionally does NOT run any step that would trigger a real SMS send (Send test SMS button, or a rule-triggered SMS dispatch), to avoid burning provider credits and spamming phones. Automation may still exercise SMS *UI configuration* flows, but never the actual send.

- [ ] [Optional] In Settings → SMS provider dropdown, select your provider.
- [ ] [Optional] Enter the required provider credentials (Textbelt: API key; Telnyx/Plivo/Twilio: API/SID + Auth + From number; ClickSend: username + key; Vonage: key + secret; Webhook: HTTPS endpoint URL). Credential fields are masked — only the last 4 characters are shown; leave blank to keep the current value. **For Telnyx, Plivo, Twilio:** the "From" number renders as a country-code dropdown plus a digits-only field (same shape as the test number / SMS recipient). Pick the country code, type digits without the leading code (e.g. `2108992131`), Save → stored as E.164 (`+12108992131`). Re-open Settings — dropdown shows the same country code, digits field shows the local digits. Empty digits → save proceeds with empty stored "From" (provider won't accept SMS dispatch until set). Non-numeric or too-short/too-long digits → toast: `Twilio "From" number: Phone number must be 7–15 digits.` (or the analogous Telnyx/Plivo message) and save aborts.
- [ ] [Optional] Scroll to the SMS recipients section (appears once a provider is selected). Click "Add recipient". Confirm the editor has a "Country code" dropdown (defaults to "🇺🇸 +1 (US/Canada)") and a "Phone number (digits only)" input. Enter Name = "E2E Phone", leave country code at +1, enter `5551234567` in the digits field, save. Toast reads `Recipient "E2E Phone" saved as +15551234567.` Re-open the recipient — dropdown is still +1 and digits show `5551234567`.
- [ ] [Optional] Edit the recipient, change the country code dropdown to a non-US entry (e.g. 🇬🇧 +44), enter `7911123456` in digits, save. Toast reads `... saved as +447911123456.` Re-open — dropdown shows +44, digits show `7911123456`.
- [ ] [Optional] Try saving with an empty digits field — toast: "Phone number is empty." With non-numeric or too-short/too-long input — toast: "Phone number must be 7–15 digits." (or "Phone number is empty." if all non-digit characters).
- [ ] [Optional] In the "Send test SMS to" field, enter your number. Click "Save settings". Toast: "Settings saved."
- [ ] [Optional] Click "Send test SMS". Toast: "Test SMS sent to +1… via [provider]."
- [ ] [Optional] Confirm SMS received on your phone with "[emAIl Sentinel] Test" in the text.
- [ ] [Optional] Edit "Test rule — E2E". In the Alert channels section, an SMS checkbox list now shows "E2E Phone (+1…)" — tick it → Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST SMS`) and click "Scan email now".
- [ ] [Optional] Toast: "1 match." Activity log: "SMS alert sent to: +1…"
- [ ] [Optional] Confirm rule-triggered SMS received on phone.
- [ ] [Optional] Webhook provider only: verify your endpoint receives the POST with JSON body `{"to": "+15551234567", "body": "[emAIl Sentinel] …"}` and responds HTTP 200.

---

## 10 · Google Chat Alert Channel Test

*Optional — requires a Google Workspace paid account with Chat enabled. Spaces are managed via add/edit/delete cards in Settings.*

- [ ] [Optional] In Settings → Google alert channels: click "Add Chat space". Enter the space name (e.g. "E2E Chat") and paste its webhook URL. Save the space card.
- [ ] [Optional] Click "Save settings".
- [ ] [Optional] Edit "Test rule — E2E". In the Alert channels section, the Google Chat checkbox list now shows "E2E Chat" — tick it → Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST Chat`) and click "Scan email now".
- [ ] [Optional] Toast: "1 match." Activity log: "Chat alert sent to: E2E Chat".
- [ ] [Optional] Confirm message posted in the configured Chat space.

---

## 11 · Google Calendar Alert Channel Test

*Optional — uses your primary calendar by default (leave Calendar ID blank).*

- [ ] [Optional] Edit "Test rule — E2E" → tick the "Google Calendar — create an event" checkbox → Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST Calendar`) and click "Scan email now".
- [ ] [Optional] Activity log: "Calendar event created."
- [ ] [Optional] Open Google Calendar. Event exists with title "[emAIl Sentinel] Test rule — E2E: SENTINEL_TEST…".
- [ ] [Optional] Event description contains From, Subject, Received, and the Gemini-generated alert message.

---

## 12 · Google Sheets & Tasks Alert Channel Tests

*Optional — alerts are written to the spreadsheet specified in Settings ▸ Sheets ID (or auto-created if blank), and to the default Tasks list.*

- [ ] [Optional] **Sheets ID — paste a URL.** In Settings, paste a full Google Sheets URL (e.g. `https://docs.google.com/spreadsheets/d/<ID>/edit?gid=0#gid=0`) into the Sheets ID field and click Save settings. (Note: the displayed value may not visually update until reload — the ID is used correctly at runtime regardless.)
- [ ] [Optional] **Sheets per-rule override.** Edit "Test rule — E2E" → tick "Google Sheets — append a log row". A "Sheets ID or URL for this rule" field appears below the checkbox. Leave blank to use the global Settings value, or paste a different Sheets URL/ID to override per rule. Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST Sheets`) and click "Scan email now".
- [ ] [Optional] Activity log: "Sheets row appended." (or "Auto-created alert spreadsheet: [ID]" the first time, if no Sheets ID was set anywhere).
- [ ] [Optional] Open the target spreadsheet. The alert row is appended to the **first tab** (no separate "Alerts" tab is created). If the first tab was empty, headers are added: Timestamp, Rule, From, Subject, Received, Alert Message. The alert message column contains plain-text content (no `**markdown**` artifacts).
- [ ] [Optional] **Local time zone in Sheets.** Both date columns (Timestamp and Received) render in your local timezone in `yyyy-MM-dd h:mm:ss AM/PM TZ` format (e.g. `2026-04-27 5:29:58 PM CDT`) — never UTC/Zulu (`...T22:29:58.636Z`). The timezone is taken from your primary Google Calendar; verify it matches what Gmail and Calendar display. The Calendar event description and Tasks note body for the same alert use the same format.
- [ ] [Optional] **Tasks per-rule override.** Edit "Test rule — E2E" → tick "Google Tasks — create a task". A "Tasks list ID for this rule" field appears below the checkbox. Leave blank to use the global Settings value (default `@default` = "My Tasks"), or paste a specific list ID. Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST Tasks`) and run check.
- [ ] [Optional] Activity log: "Task created."
- [ ] [Optional] Open Google Tasks (calendar.google.com/calendar/u/0/r/tasks or the Gmail sidebar → Tasks icon). Task "[emAIl Sentinel] Test rule — E2E: SENTINEL_TEST…" exists in "My Tasks" (default list). Task notes contain plain-text content.
- [ ] [Optional] **Calendar per-rule override.** Same pattern — tick "Google Calendar — create an event" and a "Calendar ID for this rule" field appears. Blank uses the global Settings value (or `primary` if that's also blank).

---

## 13 · MCP Server Alert Channel Test (Asana)

*Optional — send alerts to Asana, creating a task in a chosen project for every match.*

> **Two Asana type options in the dropdown.** The Type dropdown in the MCP server editor offers two Asana entries (plus Custom and Microsoft Teams). Slack was removed from the dropdown because Slack does not host an MCP server; users wanting to alert Slack should self-host an MCP-to-Slack bridge and pick the Custom type. Microsoft 365 was renamed to Microsoft Teams since Teams chat is the actual alert surface. The two Asana entries are:
>
> - **Asana (REST API — easier)** — `asana-rest`. Posts directly to Asana's REST API at `https://app.asana.com/api/1.0/tasks`. Works with a Personal Access Token (PAT) — no OAuth flow needed. This is the **recommended** path and what these instructions test by default. Endpoint auto-fills on Load defaults.
> - **Asana (MCP V2 — requires OAuth)** — `asana`. Posts JSON-RPC tools/call to `https://mcp.asana.com/v2/mcp`. PATs are rejected by V2 with `Invalid token signature - token was not issued by Asana OAuth`; you need an OAuth-issued access token from a registered Asana MCP client app. Most users should pick the REST path above.
>
> The Authorization header value field accepts the **full header value** for both — paste literally `Bearer <token>` (capital B, single space, then the token). The dispatcher does not auto-prepend `Bearer `; it sends whatever you typed.
>
> Asana V1 SSE at `https://mcp.asana.com/v1/sse` (which used to be the easy-PAT path) was shut down 2026-05-11; it is no longer available as a Type dropdown option and steps below have been migrated to the two surviving choices.

### 13a · Get your Asana credentials

- [ ] [Optional] Sign in to Asana at https://app.asana.com (the free tier is fine).
- [ ] [Optional] Pick or create a project where the test tasks should land. Open the project and copy its **project GID** from the browser URL — it's the long number between `/0/` and the next `/`. Example: in `https://app.asana.com/0/1209876543210000/list`, the GID is `1209876543210000`. Save it.
- [ ] [Optional] Open the Asana developer console at https://app.asana.com/0/my-apps. Under **Personal access tokens**, click **Create new token**, name it "emAIl Sentinel E2E", agree to the API terms, and **copy the token immediately** — Asana only shows it once.

### 13b · Configure the MCP server in emAIl Sentinel (REST API path — recommended)

- [ ] [Optional] In the add-on, open Settings → **External integrations** → **+ Add external integration**.
- [ ] [Optional] **Server name:** `E2E Asana`
- [ ] [Optional] **Type:** pick **Asana (REST API — easier)** from the dropdown, then click **Load defaults**. The Endpoint URL auto-fills to `https://app.asana.com/api/1.0/tasks`, the Tool name is left blank (the REST path does not need it), and the Tool args template pre-fills with the Asana REST task body.
- [ ] [Optional] **MCP server endpoint URL:** leave the auto-filled `https://app.asana.com/api/1.0/tasks`. Do not switch to the V1 SSE or V2 MCP endpoints — those are different paths.
- [ ] [Optional] **Authorization header value:** paste `Bearer ` followed by the PAT from step 13a, with no quotes. The full field should read like `Bearer 1/123456789abcdef…` (legacy PAT format) or `Bearer 2/<workspace>/<user>:<hash>` (current format). The capital B and the single space between `Bearer` and the token are required — the dispatcher sends this string verbatim as the `Authorization` header. Without the `Bearer ` prefix, Asana rejects with HTTP 401.
- [ ] [Optional] **Tool args template:** the Load-defaults click pre-fills this as `{"data":{"projects":["PROJECT_ID"],"name":"[emAIl Sentinel] {{subject}}","notes":"{{message}}"}}`. Replace the literal text `PROJECT_ID` with your actual project GID from step 13a. Leave `{{subject}}` and `{{message}}` placeholders intact.
- [ ] [Optional] Click **Save**. "E2E Asana" appears in the MCP server list.

### 13b-alt · Configure the MCP server (MCP V2 path — only if you have an OAuth-issued token)

*Skip this entire subsection unless you have an OAuth-issued access token from a registered Asana MCP client app. Personal Access Tokens are rejected by the V2 gateway.*

- [ ] [Optional] **Type:** pick **Asana (MCP V2 — requires OAuth)**. The Endpoint URL auto-fills to `https://mcp.asana.com/v2/mcp`. The Tool name auto-fills to `asana_create_task`.
- [ ] [Optional] **Authorization header value:** paste `Bearer ` followed by your OAuth-issued access token (typically starts with `ya29.` or similar — not the `1/` or `2/` PAT format). Same `Bearer ` prefix rule applies.
- [ ] [Optional] **Tool args template:** the Load-defaults click pre-fills this as `{"project_id":"PROJECT_ID","name":"[emAIl Sentinel] {{subject}}","notes":"{{message}}"}` — the V2 schema is flatter than REST. Replace `PROJECT_ID` with your project GID.
- [ ] [Optional] Save. The remainder of Section 13 (13c onward) works with either path.

### 13c · Wire it onto the test rule and fire an alert

- [ ] [Optional] Open Rules → edit `Test rule — E2E`. Under **MCP servers**, tick `E2E Asana` → **Save**. Toast: "Rule saved.".
- [ ] [Optional] Send a test email to yourself with subject exactly `SENTINEL_TEST MCP` (any body).
- [ ] [Optional] Wait ~30 sec for delivery, then on the home card click **Scan email now**.
- [ ] [Optional] Toast: `Check complete: 1 new email, 1 match.`
- [ ] [Optional] Open the Activity log. Newest entries include:
  - `MATCH! …`
  - `MCP alert sent to: E2E Asana`
- [ ] [Optional] Open Asana, navigate to the project from step 13a. A new task titled **"[emAIl Sentinel] SENTINEL_TEST MCP"** exists, with the alert message body in the task description/notes.

### 13d · Error paths

*The dispatcher must surface three error tiers from the MCP layer: HTTP non-2xx, JSON-RPC envelope errors, and tool-level errors (the last one was previously swallowed for SSE responses).*

- [ ] [Optional] **HTTP error.** Edit the `E2E Asana` MCP server in Settings. Change Endpoint to an invalid HTTPS URL (e.g. `https://invalid-asana-mcp.example.com/v2/mcp`) → **Save**. Send another email with subject `SENTINEL_TEST MCP fail`, then click **Scan email now**. Activity log shows: `MCP alert to "E2E Asana" FAILED: MCP "E2E Asana" HTTP <code>: …`.
- [ ] [Optional] **Tool-level error (SSE response, real Asana endpoint).** Restore Endpoint to `https://mcp.asana.com/v2/mcp`. In the Tool args template, replace the project_id with a deliberately bogus GID (e.g. `999999999999999`). Save. Send `SENTINEL_TEST MCP tool-error` and Scan email now. Activity log shows: `MCP alert to "E2E Asana" FAILED: MCP "E2E Asana" tool error: …` — the detail text comes from Asana's MCP response and typically reads "Project not found" or similar. (Pre-fix versions silently logged `MCP alert sent to: E2E Asana` with no Asana task created — this regression test guards against that.)
- [ ] [Optional] **Auth error.** With endpoint restored and project_id correct, edit the server and replace the Authorization header with `Bearer bogus_token`. Save and re-fire. The error surfaces either as an HTTP 401 line or a tool-level "Forbidden" / "Unauthorized" line, depending on whether Asana rejects at the transport or tool layer.
- [ ] [Optional] Restore the server to a working configuration (real endpoint, valid `Bearer <PAT>`, real project_id) before continuing.

### 13e · Cleanup (optional)

- [ ] [Optional] Once verified, delete the `E2E Asana` MCP server from Settings (or untick it on the rule) so future test runs don't keep creating Asana tasks.
- [ ] [Optional] If you no longer need it, revoke the PAT at https://app.asana.com/0/my-apps for hygiene.

### 13f · MCP dispatcher self-test (server-side, no UI)

*Exercises every code-path branch in `McpServers.gs sendMcpAlert_` against the deliberately-misbehaving Cloudflare Worker loopback in `testing/mcp-loopback/`. Hermetic — constructs synthetic rule + email + server objects in memory, never touches saved rules / settings. Logs structured per-mode PASS / FAIL plus an aggregate summary to the activity log.*

**Prerequisite:** Cloudflare Worker loopback must be deployed (one-time, see `testing/mcp-loopback/README.md`). The `MCP_LOOPBACK_BASE_URL_` constant in `Diagnostics.gs` must point at the deployed worker URL.

- [ ] In the Apps Script editor (script.google.com), open `Diagnostics.gs`.
- [ ] In the function dropdown above the editor, pick **`runMcpLoopbackTests`**. Click **Run**. (First run prompts for OAuth consent — approve.)
- [ ] Wait ~5–10 seconds for the function to complete (one HTTPS round-trip per mode × 9 modes). The execution log at the bottom of the editor shows the function returning `{passed: 9, total: 9, allPassed: true, results: [...]}`.
- [ ] In the add-on, open **Activity log**. The newest entries should include:
  - `=== MCP loopback self-test ===` header line
  - One `[PASS]` line per mode: `[PASS] success — expected sent — actual sent`, `[PASS] sse — …`, etc. through all 9 modes.
  - Final summary: `MCP loopback self-test: 9/9 passed`.
- [ ] **Failure interpretation.** A `[FAIL]` line names the mode and shows expected vs. actual. Common failure causes:
  - Worker URL changed but `MCP_LOOPBACK_BASE_URL_` not updated → all 9 modes fail with HTTP / DNS error in `actual`.
  - SSE-related fail (`sse` or `isErrorSse`) → bug in the `text/event-stream` parser in `sendMcpAlert_`.
  - `isError` or `isErrorSse` log "sent" instead of "failed" → the `body.result.isError === true` check regressed (this was the original silent-success bug).
  - `jsonrpcError` logs "sent" → the `body.error` envelope check regressed.
  - `http401` / `http500` log "sent" → the HTTP non-2xx tier regressed.
  - `empty` / `malformedJson` log "failed" → the swallow-on-non-JSON path regressed in the wrong direction.
- [ ] **Optional — automate via scheduled remote agent.** The Asana V1 cutoff routine `trig_012bSXvsU2uyusQb2sSQS9Qf` was set up similarly. To run `runMcpLoopbackTests` on a recurring schedule (e.g. weekly), create a routine that uses the Apps Script API `scripts.run` method against this project, with the function name `runMcpLoopbackTests`, and posts a GitHub issue if `result.allPassed === false`.

---

## 14 · Help Card Navigation

*Verify all five help topics load and contain accurate content.*

- [ ] Click Help from the home card nav or the universal "⋮" menu.
- [ ] Help card header reads: "emAIl Sentinel™ Help".
- [ ] **Search help** section appears at the top with a "Search all topics" input and a filled blue **Search** button.
- [ ] Type `Reset baseline` in the search box and click **Search**. A results card opens with header `Search: "Reset baseline"`, a grey "1 topic matched." line, and the **Settings & troubleshooting** topic listed with a snippet that has "Reset baseline" bolded. Click **Open: Settings & troubleshooting** — the full topic loads.
- [ ] Tap back, then type `scan` in the search box and click **Search**. Results card lists multiple topics matching, each with a snippet around the first occurrence.
- [ ] Tap back, then click **Search** with the box empty. Toast: "Enter a search term first." (no results card pushed).
- [ ] Tap back, then type `xyzzy123nonexistent` and click **Search**. Results card shows: "No matches in any help topic. Try a different keyword."
- [ ] Tap back to the Help card. Five topic buttons present: "Quick start & writing rules", "Rule examples by channel", "Alert channel setup", "Gemini pricing & models", "Settings & troubleshooting".
- [ ] Tap "Quick start & writing rules" — content loads with step-by-step setup instructions, the "Alert message content" field reference, the "Help me write the rule text" / "Help me write the alert text" buttons, and a **Searching help** section near the bottom that explains the search box.
- [ ] Tap back, then "Rule examples by channel" — content shows SMS, Chat, Calendar, Sheets, Tasks, and External integrations examples (Custom MCP / Asana / Microsoft Teams).
- [ ] Tap back, then "Alert channel setup" — content covers SMS (including named recipients managed via add/edit/delete cards), Google Chat webhook setup, Calendar/Sheets/Tasks defaults, and an External integrations brief. Detailed setup walkthroughs (Cloudflare Worker, Authorization header format, Asana REST, Asana MCP V2) are NOT inlined — instead a "Setup walkthroughs" section ends with an "Open external integrations setup walkthroughs" link to `https://emailsentinel.jjjjjenterprises.com/help.html#channels`. Click the link — the website opens in a new tab; verify the page renders the Cloudflare Worker code in a `<pre>` block, the Authorization header format note, and both Asana paths.
- [ ] Tap back, then "Gemini pricing & models" — model list (gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro, gemini-2.0-flash-001), free-tier limits, and pay-as-you-go rates shown.
- [ ] Tap back, then "Settings & troubleshooting" — content includes Business hours, Scan schedule, Max email age, Privacy, and troubleshooting. GitHub Issues support link is present and reads "https://github.com/StephenRJohns/email_sentinel/issues".
- [ ] Bottom of Help card shows the **Contact** block with a three-email routing table:
  - Support: `support@jjjjjenterprises.com`
  - Legal / privacy: `legal@jjjjjenterprises.com`
  - Billing: `billing@jjjjjenterprises.com`
- [ ] Below the Contact block, a grey trademark-attribution paragraph names Google, Slack, Microsoft, and Asana as trademark owners and states the project is not affiliated with or endorsed by any of these companies.

---

## 15 · Start Scheduled Scans (Time-Driven Trigger)

*Install the background trigger and confirm it appears in Apps Script.*

- [ ] Ensure the Gemini API key is configured (confirmed in Section 2).
- [ ] From the home card, a "Scan email every" dropdown is visible above a filled "Start scheduled scans" button. The dropdown's selected value matches `settings.pollMinutes` — Pro tier minimum is `1 hour`, Free tier minimum is `3 hours`. Tier-disallowed options (1 / 2 hours on Free) are hidden from the home dropdown.
- [ ] **Persistence: change interval from home card and click Start.** With the dropdown set to a non-default value (e.g. Pro tier, change `1 hour` → `4 hours`), click Start scheduled scans. Toast: "Scheduled scans started."
- [ ] Open Settings — the scan-interval dropdown now reads `4 hours` (the home-card choice was saved into `settings.pollMinutes`).
- [ ] Re-open the home card, click Stop scheduled scans, then re-open it — the home dropdown still reads `4 hours` (the saved value pre-selects on next render).
- [ ] **Auto-save on change without clicking Start.** Stop scheduled scans first. On the home card, change the dropdown from the current value to a different one (e.g. `4 hours` → `6 hours`). Do NOT click Start scheduled scans — instead navigate directly to Settings via the kebab "⋮" menu. The Settings scan-interval dropdown reads `6 hours`. (CardService doesn't auto-submit form inputs on navigation; the home dropdown wires `setOnChangeAction` → `handleHomePollChange` to persist the value silently the moment the user picks a new option, so the choice sticks even if the user navigates away before clicking Start.)
- [ ] Home card refreshes: Scanning row shows "Active". Quick setup checklist disappears (or collapses to ✓ entries).
- [ ] (In Apps Script editor) Open Triggers (left-rail clock icon). "runMailCheck" trigger is listed using `everyHours()` — matches the dropdown value selected on Start (Pro `1 hour` → every 1 hour; `4 hours` → every 4 hours; Free `3 hours` → every 3 hours; Free `6 hours` → every 6 hours).
- [ ] Wait one full trigger interval, then check Activity log — a new automatic run entry appears. Or click "Scan email now" anytime for an immediate scan that bypasses the cadence.

### 15.1 · Scan-Interval Floor Clamp at Scheduled-Scan Start

*Verify the tier-min poll floor is enforced when monitoring starts, not only when settings are saved (regression guard for the Pro→Free downgrade path).*

- [ ] While on Pro, select `1 hour` in the Settings scan-schedule dropdown and Save. Confirm the dropdown still shows `1 hour` after reload.
- [ ] Flip back to Free: in `LicenseManager.gs`, run **`setTierFree`** from the Apps Script editor.
- [ ] Open the home card. The "Scan email every" dropdown should no longer offer 1- or 2-hour options (tier filter); the displayed value falls back to the Free minimum of `3 hours` since the saved `1 hour` is no longer in the option list.
- [ ] **Without changing the dropdown**, click "Stop scheduled scans" (if running) then "Start scheduled scans" from the home card.
- [ ] Toast or activity log indicates the scan interval was clamped to the Free minimum on start ("Scheduled scans started. Set to every 3 hours (free plan minimum)." or equivalent).
- [ ] Open Settings — scan-schedule dropdown now shows `3 hours` (the Free minimum); options below 3 hours (1 hour, 2 hours) are no longer offered.
- [ ] Apps Script editor Triggers — "runMailCheck" trigger is installed at every 3 hours, not every 1 hour.

---

## 16 · Stop Scheduled Scans

*Remove the trigger and verify it is gone.*

- [ ] From the home card, click "Stop scheduled scans".
- [ ] Toast: "Scheduled scans stopped."
- [ ] Home card: Scanning row shows "Stopped". The "Scan email every" dropdown reappears with the saved interval pre-selected, and the filled "Start scheduled scans" button is back below it.
- [ ] [Optional] In Apps Script editor Triggers — "runMailCheck" trigger is no longer listed.

---

## 17 · Confirmation Dialogs on Destructive Actions

*Every destructive action must show a confirm card with Cancel before executing.*

- [ ] Clear Activity Log: In Activity log, click "Clear". A confirmation card appears: "Clear the entire activity log? This cannot be undone."
- [ ] Click "Cancel". Log is NOT cleared; returned to activity log with entries intact.
- [ ] Click "Clear" again, then "Clear" on the confirmation card. Toast: "Log cleared." Activity log shows "No activity yet."
- [ ] Delete Rule: In Rules, click "Delete" on "Test rule — E2E". Confirmation card shows the rule name and "This cannot be undone."
- [ ] Click "Cancel". Rule is NOT deleted; returned to Rules list with the rule still present.
- [ ] Click "Delete" again on the rule, then "Delete" on the confirmation card. Toast: "Rule deleted."
- [ ] Reset Baseline: In Settings, click "Reset baseline". Confirmation card opens with title "Confirm reset" and a detailed bold heading "Reset the seen-message baseline?". The body has four sub-sections in this order — **What this does** (explains per-label seen-ID list and the re-baseline behavior), **When to use it** (bulleted list of typical triggers), **What might surprise you** (warns that any unalerted-but-arrived-after-install messages will be silently absorbed; reset is global; first check takes longer; activity log is preserved), and a grey footer noting the action cannot be undone.
- [ ] Click "Cancel". Returned to Settings; baseline is NOT reset.
- [ ] Click "Reset baseline" again, then "Reset" on the confirmation card. Toast: "Seen-mail baseline cleared."

---

## 17b · Unsaved-Changes Notice on Editor Cards

*CardService gives no event for the system back arrow, so an editor cannot prompt to save unsaved changes. Verify each editor card shows the amber "click Save before tapping the back arrow" notice as its first section.*

- [ ] **Rule editor.** Rules → "+ New rule". Top section is an amber notice reading roughly: "⚠ Click Save below before tapping the back arrow — the back arrow discards unsaved changes without warning." Same notice appears when editing an existing rule.
- [ ] **Settings card.** Open Settings. Same amber notice is the first section above the Gemini key block.
- [ ] **MCP server editor.** Settings → **External integrations** → "Add external integration" (Pro tier; if on Free, flip to Pro temporarily via `setTierPro` in the Apps Script editor). Same amber notice appears at the top. Repeat with an existing server via Edit.
- [ ] **SMS recipient editor.** Settings → SMS recipients → "Add recipient". Amber notice at the top. Repeat with Edit on an existing recipient.
- [ ] **Chat space editor.** Settings → Google alert channels → "Add Chat space" (Pro tier). Amber notice at the top. Repeat with Edit on an existing space.
- [ ] **Behavior on back arrow (negative test).** In the rule editor for "Test rule — E2E", change the rule name to `Test rule — E2E (modified)` but do NOT click Save. Tap the system back arrow at the top-left of the card. Verify (a) no confirmation dialog appears, (b) the rule list shows the original name unchanged. (This is the documented limitation the notice exists to mitigate.)

---

## 17c · Navigation Back to Home (no in-card Home button)

*The in-card Home button on root cards (Rules, Settings, Activity Log, Help) was removed. Users return to home via the kebab "⋮" menu's Home universal action.*

- [ ] **Via home-card buttons (stacked nav, back arrow visible).** From the home card, click each sub-card button in turn — Settings, Rules, Activity log, Help. Gmail's native back arrow (←) is visible at the top-left of each card and returns to the home card.
- [ ] **Via kebab menu (replaced nav, no back arrow).** Click the "⋮" menu and pick Rules, Settings, Activity Log, Help in turn. The Gmail back arrow at the top-left is **NOT** shown — the stack was replaced. Use the kebab "⋮" menu's **Home** entry to return to the home card.
- [ ] **After delete-rule / clear-activity-log (popToRoot path).** Open Rules (or Activity log), click Delete on any rule (or Clear log), confirm. The card re-renders without a back arrow. Use the kebab "⋮" menu's **Home** entry to return.
- [ ] **No in-card Home button anywhere.** Verify Rules, Settings, Activity log, and Help cards do NOT show an in-card "Home" button as their first section.

---

## 17d · Universal-Action Scan: pre-scan card → spinner → result card

*The kebab menu's "Scan email now" entry uses UniversalActionResponseBuilder, which can't show toast notifications and (per empirical testing) provides NO platform-level loading feedback if the handler runs the scan directly. The user therefore lands on an intermediate **pre-scan card** with a "Run scan now" button — the button-attached spinner is the only loading indicator the user sees during the 10–60 s scan. Removing this intermediate step has been tried and reverted; do not regress it. The home card's "Scan email now" button is itself a button, so it goes directly to `handleRunCheckNow` and gets the spinner naturally.*

- [ ] Open the kebab "⋮" menu and click **Scan email now**.
- [ ] **Pre-scan card opens** with title "Scan email now", a paragraph explaining the scan, and a single filled brand-purple **Run scan now** button.
- [ ] Click **Run scan now**. The button shows a spinner while `runMailCheck` runs.
- [ ] After the scan completes, a **Scan result** card pushes on top.
- [ ] The result section shows a green ✅ banner reading "Scan complete — N new email(s), M match(es)." (text in green, e.g. `#1e7e34`). On a baseline-only run with no rules matching, the typical text is "Scan complete — 0 new emails, 0 matches."
- [ ] A "View activity log" button below the banner navigates to the Activity log card; the most recent entry there is `Manual scan: N new email(s), M match(es).`.
- [ ] **Failure path (optional, hard to force).** If the scan throws (e.g. Gemini quota exhausted with rules enabled), the banner is red ⚠ with "Scan failed: …" and the activity log shows `Manual scan failed: …`.
- [ ] **Home-card path (no pre-scan card).** Go back to the home card and click **Scan email now**. There is NO intermediate card — the button itself spins and the result card pushes on completion.

---

## 17e · "None Configured" Channel Warning Color

*An ON rule with no alert channels will fire on matches but produce nothing useful. The Channels row in the Rules list flags this misconfiguration in bold dark red; OFF rules in the same state stay plain (they aren't acting on anything).*

- [ ] Create or pick a rule, ensure it is **ON** and has zero channels checked (no SMS, Chat, MCP, Calendar, Sheets, Tasks). Open Rules and locate that rule's summary section. The **Channels** row reads "None configured" in **bold** with **dark red** color (~`#b00020`).
- [ ] Click "Disable" on the same rule (status flips to ⏸ OFF). The Channels row now reads "None configured" in **plain** styling (no bold, no red).
- [ ] Re-enable the rule (status flips back to ✅ ON). Tick at least one channel in the editor and Save. The Channels row now lists the configured channel(s) and is no longer flagged.

---

## 17f · Action Color Conventions on Buttons

*Destructive and cautionary actions are color-coded so the user gets a visual warning before clicking. Codified in `Cards.gs` as `BRAND_RED_` (`#c62828`) for delete and `BRAND_YELLOW_LIGHT_` (`#fde68a`) for disable.*

- [ ] **Delete buttons are red with white text.** Verify on every Delete button across the UI:
  - Rules list — each rule's Delete button.
  - Rule delete confirmation card — the Delete (confirm) button.
  - MCP server editor (Settings → Add/Edit MCP server) — the Delete button on the editor.
  - MCP server delete confirmation — the Delete (confirm) button.
  - SMS recipient editor (Settings → Add/Edit recipient) — the Delete button on the editor.
  - SMS recipient delete confirmation — the Delete (confirm) button.
  - Chat space editor (Settings → Add/Edit chat space) — the Delete button on the editor.
  - Chat space delete confirmation — the Delete (confirm) button.
  All eight render as filled red buttons with white text.
- [ ] **Disable button is light yellow with black text** when shown on a currently-enabled rule. Open Rules with at least one ON (✅) rule. The toggle button on that rule reads "Disable" with a filled light-yellow background and black text. Click to flip the rule to OFF (⏸) — the button now reads "Enable" with the **default** plain-text style (no fill, no color background) since enabling a rule isn't a cautionary action.
- [ ] **Other buttons unchanged.** "Edit" stays plain text; "Save", "Generate", "+ New rule", "Start scheduled scans" stay filled brand purple; "Scan email now" stays filled brand-purple-light. No other buttons should have shifted color.

---

## 18 · Business Hours Gate

*Verify that checks are skipped outside the configured window.*

- [ ] In Settings, check "Only check during business hours".
- [ ] Set Start and End to a window that does NOT include the current time (e.g., 1:00 AM to 1:30 AM).
- [ ] Click "Save settings". Toast: "Settings saved."
- [ ] Click "Scan email now" from the home card.
- [ ] Activity log newest entry: "Outside business hours — skipping check."
- [ ] Disable Business hours (uncheck the checkbox) and save settings again.

---

## 19 · Max Email Age Filter

*Verify that the max-email-age setting limits how far back the service scans a label.*

- [ ] In Settings → Scan schedule, confirm the "Only scan emails newer than (days)" field is visible with value 30.
- [ ] Change the field to 1 (one day) and click "Save settings". Toast: "Settings saved."
- [ ] Reload Settings. Confirm the field is persisted as 1.
- [ ] Create a new rule `Age test — E2E` watching INBOX with rule text "Any email from anyone." (Do not enable alert channels.)
- [ ] In Settings, click "Reset baseline" and confirm.
- [ ] Click "Scan email now".
- [ ] Activity log shows the baseline message count is limited to emails from the last 1 day (compare to a prior run with max age at 30 — baseline count should be noticeably smaller).
- [ ] Change "Only scan emails newer than (days)" back to 30 and click "Save settings".
- [ ] Try invalid input: enter 0 (zero) and save. Confirm that the stored value is clamped to a valid minimum (reopen Settings — value should be 1 or higher, not 0).
- [ ] Try non-numeric input: enter `abc` and save. Confirm fallback to the default (30) on reopen.
- [ ] Delete the "Age test — E2E" rule.

---

## 20 · Free Plan Enforcement

*Verify that tier limits are actively enforced for a Free account.*

- [ ] Home card shows "Plan: Free (N/3 rules)" and an "Upgrade to Pro" button is visible.
- [ ] **Founding-member counter.** Home card (Free users only) shows a scarcity paragraph: "Founding-member lifetime — $79" with text like "N of 500 remaining. Retired after 500 sold." The count matches `FOUNDING_MEMBERS_LIMIT - FOUNDING_MEMBERS_SOLD` in `LicenseManager.gs`. When `FOUNDING_MEMBERS_SOLD` is bumped to 500, the scarcity paragraph disappears entirely.
- [ ] **Rule count limit.** Delete any extras so you have 2 rules. Create a third — save succeeds. With 3 rules now in place, click **+ New rule** for a fourth — the rule editor does NOT open; instead a toast fires immediately: "Rule limit reached for your plan (3 rules on free). Upgrade to Pro for unlimited rules." (The check now happens at editor-entry time so the user doesn't fill out a full rule only to be rejected on Save. The save-side check in `RulesManager.upsertRule` remains as defense-in-depth — bypassing the New-rule button via programmatic save still produces the same toast.)
- [ ] **Scan-interval floor.** Open Settings and confirm the scan-schedule dropdown does NOT offer `1 hour` or `2 hours` (those options are Pro-only); the lowest available choice is `3 hours`.
- [ ] **Chat channel gated.** Open the rule editor. The Google Chat section shows "Google Chat webhooks — Pro plan only." instead of the space selection widget.
- [ ] **MCP channel gated.** Same editor shows "External integrations (Microsoft Teams, Asana, custom MCP) — Pro plan only." instead of the server selection widget.
- [ ] **AI Help me write the rule text gated.** In the rule editor, the "Help me write the rule text (Pro)" button is visible; clicking it returns a toast: "Upgrade to Pro to use AI-assisted rule writing."
- [ ] **AI Suggest alert content available on Free.** The "Help me write the alert text" button (no "(Pro)" suffix) is visible; clicking it produces a suggestion card from Gemini.
- [ ] **Starter rules respect limit.** With 2 existing rules, click "Starter rules" → "Create starter rules". Toast reports 1 created and indicates 4 were skipped for the Free plan limit.
- [ ] **SMS is allowed.** (Manual-only, see Section 9.) Configure any SMS provider and a recipient, attach to a rule, send a test — SMS dispatch works (SMS is included in the Free plan).
- [ ] **Calendar / Sheets / Tasks allowed.** Enable each on a rule and verify alerts fire (covered by Sections 11 and 12).

---

## 21 · Pro Plan Unlocks (run only when testing Pro)

*Requires a Pro license entitlement. For pre-launch testing, in `LicenseManager.gs` run **`setTierPro`** from the Apps Script editor's function dropdown to flip tier; **`setTierFree`** to revert.*

- [ ] Home card shows "Plan: Pro" and the "Upgrade to Pro" button is no longer displayed.
- [ ] **Unlimited rules.** Create a 4th, 5th, 6th rule — all save successfully.
- [ ] **1-hour scans unlocked.** Open Settings and confirm the scan-interval dropdown now includes `1 hour` and `2 hours` at the top of the list. Select `1 hour` and save. Toast: "Settings saved." Reload — dropdown shows `1 hour`. (Pro's scan-interval minimum is the 60-min Google Workspace platform floor; Free's lowest option is `3 hours`.)
- [ ] **Chat channel available.** Rule editor shows the Google Chat space selection widget (or the prompt to configure Chat in Settings if none exist).
- [ ] **MCP channel available.** Rule editor shows the MCP server selection widget (or the prompt to configure MCP in Settings).
- [ ] **AI Help me write the rule text works.** The "Help me write the rule text" button no longer displays "(Pro)"; clicking it opens a card with a multi-line text input where you describe what kinds of emails should match. Clicking Generate sends it to Gemini and produces a suggestion card with **Use this** / **Try again** buttons.
- [ ] **AI Help me write the alert text — channel-aware.** Open a rule with at least one alert channel ticked, then click "Help me write the alert text". The new card shows the selected channels in bold at the top ("Selected channels: Google Sheets log row, SMS text message"), a description input pre-populated with the existing alert prompt, and Generate / Cancel buttons. Click Generate — the suggestion card returned by Gemini reflects the channel context (e.g. brief for SMS, richer for Sheets).
- [ ] **Downgrade path.** Run **`setTierFree`**. Home card reverts to Free. Existing Pro-only channel selections on rules are ignored but preserved; verify by re-flipping to Pro and confirming selections still present on rules. The scan interval is clamped to 3 hours on the next scheduled-scan start.
- [ ] **License survives Settings save (regression).** While on Pro, open Settings, change any field (e.g. the scan interval), Save. Reload home card — Plan still shows "Pro". (Earlier bug: handleSaveSettings would silently drop `settings.license` on save, reverting tier to Free.)

---

## 22 · Sign-Off & Cleanup

*Confirm all required flows passed and restore the add-on to production configuration.*

- [ ] All items in Sections 1–8, 14–20 are checked (no skipped required items).
- [ ] Any optional sections attempted (9–13, 21): all checked items passed.
- [ ] Starter rules reviewed — edit and enable any you want active.
- [ ] Business hours set to desired production value (or disabled).
- [ ] Scan interval set to desired production value.
- [ ] Max email age set to desired production value (default: 30).
- [ ] Start scheduled scans enabled at the chosen scan interval.

Tester name: ________________________________  Date: ______________

Known issues / notes:
