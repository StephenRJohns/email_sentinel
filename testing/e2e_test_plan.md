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
- [ ] Home card loads. Status row shows: Plan = "Free (0/3 rules)", Monitoring = "Stopped", Gemini API key = "NOT configured".
- [ ] An "Upgrade to Pro" button is visible on the home card for Free users.
- [ ] Quick setup checklist is visible on the home card with grouped structure: a top-level "- Open Settings" bullet followed by indented sub-bullets "- Paste your Gemini API key" and "- Set up alert channels", plus top-level bullets for creating a rule and starting monitoring.
- [ ] Click Settings (either via the universal action "⋮" menu or the Settings nav button).
- [ ] Paste your Gemini API key into the "Gemini API key" field. The aistudio.google.com/app/apikey URL is a tappable link.
- [ ] Confirm model is "gemini-2.5-flash" (default).
- [ ] Polling field is a number text input. The hint reflects the active tier — Free hint mentions "minimum 180 min (3 hours) on Free"; Pro hint mentions "minimum 60 min on Pro". Both hints note the 60-min Google Workspace add-on platform floor.
- [ ] **Free — below tier min.** Type `60`. Save clamps to 180; toast: "Settings saved. Polling raised to 180 min (free plan minimum)." Reload — field shows 180.
- [ ] **Free — non-multiple-of-60.** Type `200`. Save snaps up to 240; toast: "Settings saved. Polling rounded up to 240 min (Gmail add-ons require multiples of 60)." Reload — field shows 240.
- [ ] **Free — exact multiple at or above tier min.** Type `360`. Saves as 360; toast: "Settings saved." Reload — field shows 360.
- [ ] **Pro — at platform floor.** Type `60`. Saves as 60; toast: "Settings saved." Reload — field shows 60.
- [ ] **Pro — non-multiple-of-60.** Type `90`. Save snaps up to 120; toast: "Settings saved. Polling rounded up to 120 min (Gmail add-ons require multiples of 60)." Reload — field shows 120.
- [ ] **Pro — below platform floor.** Type `30`. Save clamps to 60; toast: "Settings saved. Polling raised to 60 min (pro plan minimum)." Reload — field shows 60.
- [ ] **Invalid input.** Type `abc` (or 0, or -1). Toast: "Polling must be a positive whole number of minutes." No save.
- [ ] **Activity log on monitoring start.** With pollMinutes=120 (Pro), starting monitoring logs "Installed time-driven trigger: every 2 hours (polling: every 120 min)." With pollMinutes=60, logs "every 1 hour".
- [ ] Confirm "Only check emails newer than (days)" field is present and defaults to 30.
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

*Verify the log controls work correctly. Top-level cards rely on Gmail's native back-arrow for navigation back to the home card; no in-card Home button.*

- [ ] Activity log displays entries newest-first.
- [ ] **Entry formatting.** Each entry's `yyyy-MM-dd HH:mm:ss` timestamp prefix is bold; entries are separated by a blank line for readability.
- [ ] "Refresh" button reloads the log without navigating away.
- [ ] If log has more than 20 entries, "Show older (N more)" button appears and loads additional entries.
- [ ] **No redundant Home button.** Open Rules, Settings, Help, Starter rules, and Activity log — confirm each card relies on Gmail's back-arrow (←) and does not display its own "Home" button.

---

## 9 · SMS Alert Channel Test

*Optional — requires an SMS provider. Recipients are named contacts managed via add/edit/delete cards in Settings.*

> **Manual-only section.** Every step in this section is performed by the tester by hand. The Playwright automation suite intentionally does NOT run any step that would trigger a real SMS send (Send test SMS button, or a rule-triggered SMS dispatch), to avoid burning provider credits and spamming phones. Automation may still exercise SMS *UI configuration* flows, but never the actual send.

- [ ] [Optional] In Settings → SMS provider dropdown, select your provider.
- [ ] [Optional] Enter the required provider credentials (Textbelt: API key; Telnyx/Plivo/Twilio: API/SID + Auth + From number; ClickSend: username + key; Vonage: key + secret; Webhook: HTTPS endpoint URL). Credential fields are masked — only the last 4 characters are shown; leave blank to keep the current value.
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
- [ ] [Optional] **Tasks per-rule override.** Edit "Test rule — E2E" → tick "Google Tasks — create a task". A "Tasks list ID for this rule" field appears below the checkbox. Leave blank to use the global Settings value (default `@default` = "My Tasks"), or paste a specific list ID. Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST Tasks`) and run check.
- [ ] [Optional] Activity log: "Task created."
- [ ] [Optional] Open Google Tasks (calendar.google.com/calendar/u/0/r/tasks or the Gmail sidebar → Tasks icon). Task "[emAIl Sentinel] Test rule — E2E: SENTINEL_TEST…" exists in "My Tasks" (default list). Task notes contain plain-text content.
- [ ] [Optional] **Calendar per-rule override.** Same pattern — tick "Google Calendar — create an event" and a "Calendar ID for this rule" field appears. Blank uses the global Settings value (or `primary` if that's also blank).

---

## 13 · MCP Server Alert Channel Test (Asana)

*Optional — send alerts to Asana via the official Asana MCP server. Creates a task in a chosen project for every match.*

### 13a · Get your Asana credentials

- [ ] [Optional] Sign in to Asana at https://app.asana.com (the free tier is fine).
- [ ] [Optional] Pick or create a project where the test tasks should land. Open the project and copy its **project GID** from the browser URL — it's the long number between `/0/` and the next `/`. Example: in `https://app.asana.com/0/1209876543210000/list`, the GID is `1209876543210000`. Save it.
- [ ] [Optional] Open the Asana developer console at https://app.asana.com/0/my-apps. Under **Personal access tokens**, click **Create new token**, name it "emAIl Sentinel E2E", agree to the API terms, and **copy the token immediately** — Asana only shows it once.

### 13b · Configure the MCP server in emAIl Sentinel

- [ ] [Optional] In the add-on, open Settings → MCP server alerts → **+ Add MCP server**.
- [ ] [Optional] **Name:** `E2E Asana`
- [ ] [Optional] **Type:** select `Asana` from the dropdown, then click **Load defaults**. Tool name auto-fills as `asana_create_task` and Tool args template auto-fills as `{"project_id":"PROJECT_ID","name":"[emAIl Sentinel] {{subject}}","notes":"{{message}}"}`.
- [ ] [Optional] **Endpoint:** `https://mcp.asana.com/v2/mcp` (the V1 `/sse` endpoint is deprecated and shuts down 2026-05-11 — do not use it).
- [ ] [Optional] **Auth token:** paste `Bearer ` followed by the PAT from step 13a (so the field looks like `Bearer 1/123456789abcdef…`).
- [ ] [Optional] **Tool args template:** replace the literal text `PROJECT_ID` with your actual project GID from step 13a. Leave `{{subject}}` and `{{message}}` placeholders intact.
- [ ] [Optional] Click **Save**. "E2E Asana" appears in the MCP server list.

### 13c · Wire it onto the test rule and fire an alert

- [ ] [Optional] Open Rules → edit `Test rule — E2E`. Under **MCP servers**, tick `E2E Asana` → **Save**. Toast: "Rule saved.".
- [ ] [Optional] Send a test email to yourself with subject exactly `SENTINEL_TEST MCP` (any body).
- [ ] [Optional] Wait ~30 sec for delivery, then on the home card click **Scan email now**.
- [ ] [Optional] Toast: `Check complete: 1 new email, 1 match.`
- [ ] [Optional] Open the Activity log. Newest entries include:
  - `MATCH! …`
  - `MCP alert sent to: E2E Asana`
- [ ] [Optional] Open Asana, navigate to the project from step 13a. A new task titled **"[emAIl Sentinel] SENTINEL_TEST MCP"** exists, with the alert message body in the task description/notes.

### 13d · Error path

- [ ] [Optional] Edit the `E2E Asana` MCP server in Settings. Change Endpoint to an invalid HTTPS URL (e.g. `https://invalid-asana-mcp.example.com/v2/mcp`) → **Save**.
- [ ] [Optional] Send another email with subject `SENTINEL_TEST MCP fail`, then click **Scan email now**.
- [ ] [Optional] Activity log shows: `MCP alert to "E2E Asana" FAILED: …` with the HTTP error.
- [ ] [Optional] Edit the server again and restore Endpoint to `https://mcp.asana.com/v2/mcp` → Save.

### 13e · Cleanup (optional)

- [ ] [Optional] Once verified, delete the `E2E Asana` MCP server from Settings (or untick it on the rule) so future test runs don't keep creating Asana tasks.
- [ ] [Optional] If you no longer need it, revoke the PAT at https://app.asana.com/0/my-apps for hygiene.

---

## 14 · Help Card Navigation

*Verify all five help topics load and contain accurate content.*

- [ ] Click Help from the home card nav or the universal "⋮" menu.
- [ ] Help card header reads: "emAIl Sentinel™ Help".
- [ ] **Search help** section appears at the top with a "Search all topics" input and a filled blue **Search** button.
- [ ] Type `Reset baseline` in the search box and click **Search**. A results card opens with header `Search: "Reset baseline"`, a grey "1 topic matched." line, and the **Settings & troubleshooting** topic listed with a snippet that has "Reset baseline" bolded. Click **Open: Settings & troubleshooting** — the full topic loads.
- [ ] Tap back, then type `polling` in the search box and click **Search**. Results card lists multiple topics matching, each with a snippet around the first occurrence.
- [ ] Tap back, then click **Search** with the box empty. Toast: "Enter a search term first." (no results card pushed).
- [ ] Tap back, then type `xyzzy123nonexistent` and click **Search**. Results card shows: "No matches in any help topic. Try a different keyword."
- [ ] Tap back to the Help card. Five topic buttons present: "Quick start & writing rules", "Rule examples by channel", "Alert channel setup", "Gemini pricing & models", "Settings & troubleshooting".
- [ ] Tap "Quick start & writing rules" — content loads with step-by-step setup instructions, the "Alert message content" field reference, the "Help me write the rule text" / "Help me write the alert text" buttons, and a **Searching help** section near the bottom that explains the search box.
- [ ] Tap back, then "Rule examples by channel" — content shows SMS, Chat, Calendar, Sheets, Tasks, and MCP server examples (Slack, Asana).
- [ ] Tap back, then "Alert channel setup" — content covers SMS (including named recipients managed via add/edit/delete cards), Google Chat webhook setup, Calendar/Sheets/Tasks defaults, and MCP server configuration.
- [ ] Tap back, then "Gemini pricing & models" — model list (gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro, gemini-2.0-flash-001), free-tier limits, and pay-as-you-go rates shown.
- [ ] Tap back, then "Settings & troubleshooting" — content includes Business hours, Polling, Max email age, Privacy, and troubleshooting. GitHub Issues support link is present and reads "https://github.com/StephenRJohns/email_sentinel/issues".
- [ ] Bottom of Help card shows the **Contact** block with a three-email routing table:
  - Support: `support@jjjjjenterprises.com`
  - Legal / privacy: `legal@jjjjjenterprises.com`
  - Billing: `billing@jjjjjenterprises.com`
- [ ] Below the Contact block, a grey trademark-attribution paragraph names Google, Slack, Microsoft, and Asana as trademark owners and states the project is not affiliated with or endorsed by any of these companies.

---

## 15 · Start Monitoring (Time-Driven Trigger)

*Install the background trigger and confirm it appears in Apps Script.*

- [ ] Ensure the Gemini API key is configured (confirmed in Section 2).
- [ ] From the home card, the "Start monitoring" button shows the current polling interval — e.g. "Start monitoring at 60 minutes" (Pro) or "Start monitoring at 180 minutes" (Free), with `minute` / `minutes` pluralized correctly.
- [ ] Click the button. Toast: "Monitoring started."
- [ ] Home card refreshes: Monitoring row shows "Running". Quick setup checklist disappears (or collapses to ✓ entries).
- [ ] (In Apps Script editor) Open Triggers (left-rail clock icon). "runMailCheck" trigger is listed using `everyHours()` — for Pro pollMinutes=60 → every 1 hour; for Pro pollMinutes=120 → every 2 hours; for Free pollMinutes=180 → every 3 hours; for Free pollMinutes=360 → every 6 hours.
- [ ] Wait one full trigger interval, then check Activity log — a new automatic run entry appears. Or click "Scan email now" anytime for an immediate check that bypasses the cadence.

### 15.1 · Poll-Floor Clamp at Monitoring Start

*Verify the tier-min poll floor is enforced when monitoring starts, not only when settings are saved (regression guard for the Pro→Free downgrade path).*

- [ ] While on Pro, set polling interval to 60 minutes and Save settings. Confirm stored value is 60.
- [ ] Flip back to Free: in `LicenseManager.gs`, run **`setTierFree`** from the Apps Script editor.
- [ ] **Without changing polling**, click "Stop monitoring" (if running) then "Start monitoring" from the home card.
- [ ] Toast or activity log indicates the polling interval was clamped to the Free minimum on start ("Polling raised to 180 min (free plan minimum)" or equivalent).
- [ ] Open Settings — polling interval is now 180.
- [ ] Apps Script editor Triggers — "runMailCheck" trigger is installed at every 3 hours, not every 1 hour.

---

## 16 · Stop Monitoring

*Remove the trigger and verify it is gone.*

- [ ] From the home card, click "Stop monitoring".
- [ ] Toast: "Monitoring stopped."
- [ ] Home card: Monitoring row shows "Stopped". "Start monitoring" button is now filled/prominent.
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
- [ ] Reset Baseline: In Settings, click "Reset baseline". Confirmation card: "Reset the seen-message baseline? The next check will re-scan all labels and skip alerting on existing messages."
- [ ] Click "Cancel". Returned to Settings; baseline is NOT reset.
- [ ] Click "Reset baseline" again, then "Reset" on the confirmation card. Toast: "Seen-mail baseline cleared."

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

- [ ] In Settings → Polling, confirm the "Only check emails newer than (days)" field is visible with value 30.
- [ ] Change the field to 1 (one day) and click "Save settings". Toast: "Settings saved."
- [ ] Reload Settings. Confirm the field is persisted as 1.
- [ ] Create a new rule `Age test — E2E` watching INBOX with rule text "Any email from anyone." (Do not enable alert channels.)
- [ ] In Settings, click "Reset baseline" and confirm.
- [ ] Click "Scan email now".
- [ ] Activity log shows the baseline message count is limited to emails from the last 1 day (compare to a prior run with max age at 30 — baseline count should be noticeably smaller).
- [ ] Change "Only check emails newer than (days)" back to 30 and click "Save settings".
- [ ] Try invalid input: enter 0 (zero) and save. Confirm that the stored value is clamped to a valid minimum (reopen Settings — value should be 1 or higher, not 0).
- [ ] Try non-numeric input: enter `abc` and save. Confirm fallback to the default (30) on reopen.
- [ ] Delete the "Age test — E2E" rule.

---

## 20 · Free Plan Enforcement

*Verify that tier limits are actively enforced for a Free account.*

- [ ] Home card shows "Plan: Free (N/3 rules)" and an "Upgrade to Pro" button is visible.
- [ ] **Founding-member counter.** Home card (Free users only) shows a scarcity paragraph: "Founding-member lifetime — $79" with text like "N of 500 remaining. Retired after 500 sold." The count matches `FOUNDING_MEMBERS_LIMIT - FOUNDING_MEMBERS_SOLD` in `LicenseManager.gs`. When `FOUNDING_MEMBERS_SOLD` is bumped to 500, the scarcity paragraph disappears entirely.
- [ ] **Rule count limit.** Delete any extras so you have 2 rules. Create a third — save succeeds. Create a fourth — save fails with toast: "Rule limit reached for your plan (3 rules on Free). Upgrade to Pro for unlimited rules."
- [ ] **Polling floor.** In Settings, set polling interval to 60 minutes and save. Toast: "Settings saved. Polling raised to 180 min (free plan minimum)." Reload Settings — field shows 180.
- [ ] **Chat channel gated.** Open the rule editor. The Google Chat section shows "Google Chat webhooks — Pro plan only." instead of the space selection widget.
- [ ] **MCP channel gated.** Same editor shows "MCP servers (Slack, Teams, Asana) — Pro plan only." instead of the server selection widget.
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
- [ ] **1-hour polling unlocked.** In Settings, set polling to 60 minutes and save. Toast: "Settings saved." Reload — value persists as 60. (Pro's polling minimum is the Google Workspace platform floor of 60 min; Free is clamped to 180 min minimum.)
- [ ] **Chat channel available.** Rule editor shows the Google Chat space selection widget (or the prompt to configure Chat in Settings if none exist).
- [ ] **MCP channel available.** Rule editor shows the MCP server selection widget (or the prompt to configure MCP in Settings).
- [ ] **AI Help me write the rule text works.** The "Help me write the rule text" button no longer displays "(Pro)"; clicking it opens a card with a multi-line text input where you describe what kinds of emails should match. Clicking Generate sends it to Gemini and produces a suggestion card with **Use this** / **Try again** buttons.
- [ ] **AI Help me write the alert text — channel-aware.** Open a rule with at least one alert channel ticked, then click "Help me write the alert text". The new card shows the selected channels in bold at the top ("Selected channels: Google Sheets log row, SMS text message"), a description input pre-populated with the existing alert prompt, and Generate / Cancel buttons. Click Generate — the suggestion card returned by Gemini reflects the channel context (e.g. brief for SMS, richer for Sheets).
- [ ] **Downgrade path.** Run **`setTierFree`**. Home card reverts to Free. Existing Pro-only channel selections on rules are ignored but preserved; verify by re-flipping to Pro and confirming selections still present on rules. Polling is clamped to 180 min on next monitoring start.
- [ ] **License survives Settings save (regression).** While on Pro, open Settings, change any field (e.g. polling), Save. Reload home card — Plan still shows "Pro". (Earlier bug: handleSaveSettings would silently drop `settings.license` on save, reverting tier to Free.)

---

## 22 · Sign-Off & Cleanup

*Confirm all required flows passed and restore the add-on to production configuration.*

- [ ] All items in Sections 1–8, 14–20 are checked (no skipped required items).
- [ ] Any optional sections attempted (9–13, 21): all checked items passed.
- [ ] Starter rules reviewed — edit and enable any you want active.
- [ ] Business hours set to desired production value (or disabled).
- [ ] Polling interval set to desired production value.
- [ ] Max email age set to desired production value (default: 30).
- [ ] Start monitoring enabled at the chosen polling interval.

Tester name: ________________________________  Date: ______________

Known issues / notes:
