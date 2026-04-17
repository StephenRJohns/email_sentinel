# emAIl Sentinel — End-to-End Test Plan · Issue #10

Complete every item in order. All items in Sections 1–8 and 14–20 are required.
Sections 9–13 are optional alert-channel tests.

---

## 1 · Prerequisites

*Confirm these are in place before opening Gmail.*

- [ ] Google account with Gmail access.
- [ ] Gemini API key obtained from aistudio.google.com/app/apikey (free, no credit card required).
- [ ] Add-on installed — either via "clasp push + Test deployments → Install" or by pasting source files manually in script.google.com.
- [ ] Gmail is open in a browser tab and the emAIl Sentinel icon is visible in the right-hand add-on rail.

---

## 2 · Initial Settings Setup

*Open the add-on, configure the Gemini key, and verify the connection.*

- [ ] Click the emAIl Sentinel icon in the Gmail add-on rail.
- [ ] Home card loads. Status row shows: Monitoring = "Stopped", Gemini API key = "NOT configured".
- [ ] Quick setup checklist is visible on the home card with grouped structure: a top-level "- Open Settings" bullet followed by indented sub-bullets "- Paste your Gemini API key" and "- Set up alert channels", plus top-level bullets for creating a rule and starting monitoring.
- [ ] Click Settings (either via the universal action "⋮" menu or the Settings nav button).
- [ ] Paste your Gemini API key into the "Gemini API key" field. The aistudio.google.com/app/apikey URL is a tappable link.
- [ ] Confirm model is "gemini-2.5-flash" (default).
- [ ] Set polling interval to 5 minutes (default).
- [ ] Confirm "Only check emails newer than (days)" field is present and defaults to 30.
- [ ] Click "Save settings". Toast notification reads: "Settings saved."
- [ ] Click "Test Gemini". Toast reads: "Gemini OK — model responded."
- [ ] Navigate back to Home card. Gemini API key row now shows "Configured". In the Quick setup checklist, the "Paste your Gemini API key" sub-bullet now shows a ✓.

---

## 3 · Starter Rules

*Create the five built-in rules from the home card shortcut.*

- [ ] From the home card, click "Starter rules".
- [ ] Preview card shows exactly 5 rules to be created (Urgent emails, Invoices & payment requests, Shipping & delivery updates, Security & account alerts, Bills & subscription renewals).
- [ ] Click "Create starter rules".
- [ ] Toast reads: "5 starter rules created (disabled). Edit each to add alert recipients and enable."
- [ ] Rules card opens. All 5 rules are listed with OFF status.
- [ ] Click back to Home card. Rules row shows "0 enabled / 5 total".

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

- [ ] From the home card, click "Run check now".
- [ ] Toast shows check result (typically "0 new email(s), 0 match(es)" or baseline messages).
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

- [ ] From the home card, click "Run check now".
- [ ] Toast shows: "Check complete: 1 new email(s), 1 match(es)." (numbers may vary if other new mail arrived).
- [ ] Click "Activity log".
- [ ] Log shows: Label "INBOX": 1 new message(s).
- [ ] Log shows: From: [your address] | Subject: SENTINEL_TEST…
- [ ] Log shows: Evaluating against rule "Test rule — E2E" …
- [ ] Log shows: MATCH! [brief Gemini reason]
- [ ] No SMS / Chat / Calendar / Sheets / Task / MCP entries appear (no channels were configured).

---

## 8 · Activity Log UI

*Verify the log controls work correctly.*

- [ ] Activity log displays entries newest-first.
- [ ] "Refresh" button reloads the log without navigating away.
- [ ] Home button is shown only when the back arrow is absent (not duplicated alongside back navigation).
- [ ] If log has more than 20 entries, "Show older (N more)" button appears and loads additional entries.

---

## 9 · SMS Alert Channel Test

*Optional — requires an SMS provider. Recipients are named contacts managed via add/edit/delete cards in Settings.*

- [ ] [Optional] In Settings → SMS provider dropdown, select your provider.
- [ ] [Optional] Enter the required provider credentials (Textbelt: API key; Telnyx/Plivo/Twilio: API/SID + Auth + From number; ClickSend: username + key; Vonage: key + secret; Webhook: HTTPS endpoint URL). Credential fields are masked — only the last 4 characters are shown; leave blank to keep the current value.
- [ ] [Optional] Scroll to the SMS recipients section (appears once a provider is selected). Click "Add recipient". Enter Name = "E2E Phone" and Number = your E.164 phone number (e.g. +15551234567). Save the recipient card.
- [ ] [Optional] In the "Send test SMS to" field, enter your number. Click "Save settings". Toast: "Settings saved."
- [ ] [Optional] Click "Send test SMS". Toast: "Test SMS sent to +1… via [provider]."
- [ ] [Optional] Confirm SMS received on your phone with "[emAIl Sentinel] Test" in the text.
- [ ] [Optional] Edit "Test rule — E2E". In the Alert channels section, an SMS checkbox list now shows "E2E Phone (+1…)" — tick it → Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST SMS`) and click "Run check now".
- [ ] [Optional] Toast: "1 match(es)." Activity log: "SMS alert sent to: +1…"
- [ ] [Optional] Confirm rule-triggered SMS received on phone.
- [ ] [Optional] Webhook provider only: verify your endpoint receives the POST with JSON body `{"to": "+15551234567", "body": "[emAIl Sentinel] …"}` and responds HTTP 200.

---

## 10 · Google Chat Alert Channel Test

*Optional — requires a Google Workspace paid account with Chat enabled. Spaces are managed via add/edit/delete cards in Settings.*

- [ ] [Optional] In Settings → Google alert channels: click "Add Chat space". Enter the space name (e.g. "E2E Chat") and paste its webhook URL. Save the space card.
- [ ] [Optional] Click "Save settings".
- [ ] [Optional] Edit "Test rule — E2E". In the Alert channels section, the Google Chat checkbox list now shows "E2E Chat" — tick it → Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST Chat`) and click "Run check now".
- [ ] [Optional] Toast: "1 match(es)." Activity log: "Chat alert sent to: E2E Chat".
- [ ] [Optional] Confirm message posted in the configured Chat space.

---

## 11 · Google Calendar Alert Channel Test

*Optional — uses your primary calendar by default (leave Calendar ID blank).*

- [ ] [Optional] Edit "Test rule — E2E" → tick the "Google Calendar — create an event" checkbox → Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST Calendar`) and click "Run check now".
- [ ] [Optional] Activity log: "Calendar event created."
- [ ] [Optional] Open Google Calendar. Event exists with title "[emAIl Sentinel] Test rule — E2E: SENTINEL_TEST…".
- [ ] [Optional] Event description contains From, Subject, Received, and the Gemini-generated alert message.

---

## 12 · Google Sheets & Tasks Alert Channel Tests

*Optional — Sheets auto-creates a spreadsheet on first alert if you leave the ID blank.*

- [ ] [Optional] Google Sheets: Edit "Test rule — E2E" → tick "Google Sheets — append a log row" → Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST Sheets`) and run check.
- [ ] [Optional] Activity log: "Sheets row appended." or "Auto-created alert spreadsheet: [ID]".
- [ ] [Optional] Open Google Drive. Spreadsheet "emAIl Sentinel — Alert Log" exists.
- [ ] [Optional] Sheet has columns: Timestamp, Rule, From, Subject, Received, Alert Message. Row is populated.
- [ ] [Optional] Google Tasks: Edit "Test rule — E2E" → tick "Google Tasks — create a task" → Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST Tasks`) and run check.
- [ ] [Optional] Activity log: "Task created."
- [ ] [Optional] Open Google Tasks (Gmail sidebar → Tasks icon). Task "[emAIl Sentinel] Test rule — E2E: SENTINEL_TEST…" exists.

---

## 13 · MCP Server Alert Channel Test

*Optional — send alerts to Slack, Microsoft 365 / Teams, Asana, or any custom MCP server via JSON-RPC 2.0 over HTTPS.*

- [ ] [Optional] In Settings → MCP server alerts, click "Add MCP server".
- [ ] [Optional] Enter Name = "E2E MCP", select Type (e.g. "Slack"), click "Load defaults" — the Tool name and Tool args template populate from the preset.
- [ ] [Optional] Paste your MCP server Endpoint (HTTPS), Auth token (e.g. "Bearer …"), and adjust the Tool args template to reference a real channel/chat/project ID for the target tool.
- [ ] [Optional] Click "Save". The server appears in the MCP server list in Settings.
- [ ] [Optional] Edit "Test rule — E2E". The "MCP servers" checkbox list now shows "E2E MCP" — tick it → Save.
- [ ] [Optional] Send another test email (subject: `SENTINEL_TEST MCP`) and click "Run check now".
- [ ] [Optional] Toast: "1 match(es)." Activity log: "MCP alert sent to: E2E MCP".
- [ ] [Optional] Confirm the alert arrived in the target system (Slack channel, Teams chat, Asana project, etc.).
- [ ] [Optional] Error path: edit the MCP server, change Endpoint to an invalid HTTPS URL, save. Send another SENTINEL_TEST email and run check. Activity log: "MCP alert to 'E2E MCP' FAILED: …". Restore the valid endpoint afterward.

---

## 14 · Help Card Navigation

*Verify all five help topics load and contain accurate content.*

- [ ] Click Help from the home card nav or the universal "⋮" menu.
- [ ] Help card header reads: "emAIl Sentinel™ Help".
- [ ] Five topic buttons present: "Quick start & writing rules", "Rule examples by channel", "Alert channel setup", "Gemini pricing & models", "Settings & troubleshooting".
- [ ] Tap "Quick start & writing rules" — content loads with step-by-step setup instructions, the "Alert message content" field reference, and the "Suggest rule text" / "Suggest content for selected channels" buttons.
- [ ] Tap back, then "Rule examples by channel" — content shows SMS, Chat, Calendar, Sheets, Tasks, and MCP server examples (Slack, Asana).
- [ ] Tap back, then "Alert channel setup" — content covers SMS (including named recipients managed via add/edit/delete cards), Google Chat webhook setup, Calendar/Sheets/Tasks defaults, and MCP server configuration.
- [ ] Tap back, then "Gemini pricing & models" — model list (gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro, gemini-2.0-flash-001), free-tier limits, and pay-as-you-go rates shown.
- [ ] Tap back, then "Settings & troubleshooting" — content includes Business hours, Polling, Max email age, Privacy, and troubleshooting. GitHub Issues support link is present and reads "https://github.com/StephenRJohns/email_sentinel/issues".
- [ ] Bottom of Help card shows the JJJJJ Enterprises, LLC credit and the legal contact email legal@jjjjjenterprises.com.

---

## 15 · Start Monitoring (Time-Driven Trigger)

*Install the background trigger and confirm it appears in Apps Script.*

- [ ] Ensure the Gemini API key is configured (confirmed in Section 2).
- [ ] From the home card, click "Start monitoring".
- [ ] Toast: "Monitoring started."
- [ ] Home card refreshes: Monitoring row shows "Running". Quick setup checklist disappears (or collapses to ✓ entries).
- [ ] (In Apps Script editor) Open Triggers (left-rail clock icon). "runMailCheck" trigger is listed with the correct interval (e.g., every 5 minutes).
- [ ] Wait one full trigger interval, then check Activity log — a new automatic run entry appears.

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
- [ ] Click "Run check now" from the home card.
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
- [ ] Click "Run check now".
- [ ] Activity log shows the baseline message count is limited to emails from the last 1 day (compare to a prior run with max age at 30 — baseline count should be noticeably smaller).
- [ ] Change "Only check emails newer than (days)" back to 30 and click "Save settings".
- [ ] Try invalid input: enter 0 (zero) and save. Confirm that the stored value is clamped to a valid minimum (reopen Settings — value should be 1 or higher, not 0).
- [ ] Try non-numeric input: enter `abc` and save. Confirm fallback to the default (30) on reopen.
- [ ] Delete the "Age test — E2E" rule.

---

## 20 · Sign-Off & Cleanup

*Confirm all required flows passed and restore the add-on to production configuration.*

- [ ] All items in Sections 1–8 and 14–19 are checked (no skipped required items).
- [ ] Any optional sections attempted (9–13): all checked items passed.
- [ ] Starter rules reviewed — edit and enable any you want active.
- [ ] Business hours set to desired production value (or disabled).
- [ ] Polling interval set to desired production value.
- [ ] Max email age set to desired production value (default: 30).
- [ ] Start monitoring enabled at the chosen polling interval.

Tester name: ________________________________  Date: ______________

Known issues / notes:
