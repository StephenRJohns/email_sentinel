# MailAlert

A Gmail Workspace Add-on that watches your Gmail for new messages and sends an alert when one matches a rule you describe in plain English. Rules are evaluated by **Google Gemini**.

This is the Google Workspace port of the original [`bb_mailalerter`](../mailalerter) Windows desktop app — same idea, but it lives entirely inside your Google account: no machine to keep running, no Outlook, no Teams, no Anthropic key.

---

## Table of contents

1. [What it does](#1-what-it-does)
2. [How it works](#2-how-it-works)
3. [Repository layout](#3-repository-layout)
4. [Prerequisites](#4-prerequisites)
5. [Install with `clasp`](#5-install-with-clasp)
6. [Install via the Apps Script editor (no CLI)](#6-install-via-the-apps-script-editor-no-cli)
7. [First-run configuration](#7-first-run-configuration)
8. [Writing rules](#8-writing-rules)
9. [Alert channels](#9-alert-channels)
10. [Privacy and storage](#10-privacy-and-storage)
11. [Troubleshooting](#11-troubleshooting)
12. [Why an Add-on instead of a Chrome extension?](#12-why-an-add-on-instead-of-a-chrome-extension)
13. [Legal](#13-legal)

---

## 1. What it does

When a new email arrives in a watched Gmail label, MailAlert asks Gemini whether it matches one of your rules. If it does, it fires the alerts you configured for that rule:

- **Email** to one or more addresses, sent from your own Gmail account.
- **SMS** via your configured provider (Twilio out of the box, or any provider via a generic webhook).

Rules are plain English. No regex, no code:

> *"If I get an email from any address at tma.com that has a PDF attachment that looks like an invoice or purchase order."*

---

## 2. How it works

```
┌──────────────────────────────────────────────────────────────┐
│  Apps Script time-driven trigger (every 1/5/10/15/30 min)    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  runMailCheck()                                        │  │
│  │  • For each enabled rule's labels:                     │  │
│  │    – GmailApp.search() → recent messages               │  │
│  │    – Diff against per-label seen-ID set                │  │
│  │    – New messages × matching rules:                    │  │
│  │      → Gemini: does this match the rule?               │  │
│  │      → If YES: Gemini formats the alert message        │  │
│  │      → GmailApp.sendEmail() / Twilio / webhook         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Add-on UI (Cards) — Rules, Settings, Activity log, Help     │
└──────────────────────────────────────────────────────────────┘
```

All state lives in `PropertiesService.getUserProperties()`:

| Key | Contents |
|---|---|
| `mailalert.settings` | Gemini key, model, poll interval, business hours, SMS config |
| `mailalert.rules`    | JSON array of rule objects |
| `mailalert.seen`     | Per-label list of recently-seen Gmail message IDs |
| `mailalert.log`      | Ring buffer of the last ~80 activity log lines |

`UserProperties` is **private to the running user** and **per-script** — nobody but you (and the add-on running in your account) can read it.

---

## 3. Repository layout

```
mailalert/
├── appsscript.json        # Add-on manifest (scopes, homepage trigger, universal actions)
├── .clasp.json            # clasp project config — paste your scriptId here
├── .claspignore           # Limits clasp push to .gs / .html / appsscript.json
│
├── Code.gs                # Entry points: onHomepage, universal actions
├── Cards.gs               # All CardService UI (home, rules, editor, settings, log, help)
├── MailWatcher.gs         # Time-driven trigger handler — polls Gmail, dispatches matches
├── RuleEvaluator.gs       # Gemini REST calls (rule evaluation + alert formatting)
├── AlertDispatcher.gs     # Sends alerts via Gmail and Twilio / generic webhook
├── RulesManager.gs        # CRUD for rules in UserProperties
├── SettingsManager.gs     # CRUD for settings; business-hours helpers
├── ActivityLog.gs         # Ring-buffered activity log
│
├── Help.html              # Help content rendered inside the help card
└── README.md              # You are here
```

There is no build step, no `requirements.txt`, no installer. The whole thing is JavaScript that runs on Google's servers.

---

## 4. Prerequisites

- A Google account (personal Gmail or Google Workspace).
- A free **Gemini API key** from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
- (Optional) A **Twilio** account or any HTTPS endpoint for SMS alerts.
- For the `clasp` install path: [Node.js 18+](https://nodejs.org) and `npm`.

---

## 5. Install with `clasp`

`clasp` is Google's CLI for pushing local Apps Script files into a project.

```bash
# 1. Install clasp once, globally
npm install -g @google/clasp

# 2. Log in to your Google account in the browser that pops up
clasp login

# 3. From this directory, create a new Apps Script project
cd mailalert
clasp create --type standalone --title "MailAlert" --rootDir .
#   ↑ this writes a real scriptId into .clasp.json

# 4. Push all the .gs / .html / appsscript.json files
clasp push

# 5. Open the project in the browser to install the add-on
clasp open
```

Inside the Apps Script editor:

1. Click **Deploy ▸ Test deployments**.
2. Click **Install** under "Test the latest code".
3. Choose **Gmail** as the host.
4. Approve the OAuth consent screen.
5. Open Gmail in another tab — the MailAlert icon appears in the right-hand add-on rail.

---

## 6. Install via the Apps Script editor (no CLI)

If you'd rather not install `clasp`:

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. In the file tree on the left, create a file for each `.gs` and `.html` in this repo and paste in its contents. Replace the auto-created `Code.gs` with this repo's `Code.gs`.
3. Click the gear ▸ **Project Settings** ▸ check **Show appsscript.json** ▸ then open `appsscript.json` and replace its contents with this repo's `appsscript.json`.
4. **Deploy ▸ Test deployments ▸ Install** as in step 5 of the `clasp` flow above.

---

## 7. First-run configuration

After installation, open Gmail and click the MailAlert icon in the right rail.

1. **Settings ▸ Gemini API key** — paste your key. Click **Test Gemini** to confirm it works.
2. **Settings ▸ Polling** — pick how often to check (default 5 minutes).
3. **Settings ▸ SMS provider** *(optional)* — choose Twilio or a generic webhook and fill in credentials.
4. **Settings ▸ Save settings**.
5. **Rules ▸ + New rule** — give it a name, list one or more Gmail labels (e.g. `INBOX`), describe the match in plain English, and pick alert recipients.
6. Back on the home card, click **Start monitoring**. This installs a time-driven trigger that runs in the background even when Gmail is closed.

The **first** check for any new label is treated as a baseline (no alerts) so you don't get a flood of notifications for existing mail. Alerts start with the next new message.

---

## 8. Writing rules

Rules are evaluated by Gemini against:

- the sender,
- the subject,
- the first 2,000 characters of the body,
- and the **filenames** of any attachments.

Attachment **contents** are not read.

Good examples:

- `"Any email from anyone @tma.com that has a PDF attachment that looks like an invoice or purchase order."`
- `"Subject contains URGENT or CRITICAL."`
- `"Email from boss@company.com asking for a status update."`
- `"Automated notification about a server being down or an alert being triggered."`

Each rule also has an **Alert message format** field — plain-English instructions Gemini uses to compose the alert message itself. The default produces a date / sender / subject / summary / action items block; override it per rule when you want something different (a one-liner, a bullet list, …).

---

## 9. Alert channels

### Email
Sent via `GmailApp.sendEmail` from your own Gmail account. The display name on the outgoing message is configurable in **Settings ▸ Alert "From" name**. There is no SMTP server to host or app password to manage.

> **Quota:** consumer Gmail allows ~100 outgoing add-on emails/day; Workspace allows ~1,500/day. MailAlert is well under this for normal use.

### SMS
Google Workspace does not provide a first-party SMS API, so MailAlert ships with native support for six SMS providers plus a generic webhook escape hatch. Click **SMS setup guide** in the add-on Settings for a comparison table with sign-up links and step-by-step instructions.

| Provider | Cost (US domestic) | Phone # needed? | Free trial? | Auth method |
|---|---|---|---|---|
| **Textbelt** | ~$0.04/SMS | No | 1 free/day (key: `textbelt`) | API key |
| **Telnyx** | ~$0.004/SMS | Yes (~$1/mo) | Free credits | Bearer token |
| **Plivo** | ~$0.005/SMS | Yes (~$0.80/mo) | $10 free credit | Basic auth |
| **Twilio** | ~$0.0079/SMS | Yes (~$1.15/mo) | $15 free credit | Basic auth |
| **ClickSend** | ~$0.0226/SMS | No | Free trial credits | Basic auth |
| **Vonage** | ~$0.0068/SMS | No | Free credits (no CC) | API key + secret |
| **Generic webhook** | (your endpoint) | (your choice) | N/A | (your choice) |

**Recommendations:**
- **Quickest start (no sign-up):** Textbelt with the free key `textbelt` — 1 free SMS/day, no account needed.
- **Cheapest at scale:** Telnyx (~$0.004/SMS), then Plivo (~$0.005/SMS).
- **No phone number to manage:** Textbelt, ClickSend, or Vonage send from a shared/system number.
- **Already have an SMS gateway:** Generic webhook POSTs `{"to": "+15551234567", "body": "..."}` to any HTTPS URL.

Phone numbers in rules and settings should be in [E.164 format](https://en.wikipedia.org/wiki/E.164): `+15551234567`.

After configuring a provider in Settings, click **Send test SMS** to verify it works.

### Google-native channels (free)

These use your existing Google account — no third-party sign-up, no cost.

| Channel | What it does | How to set up |
|---|---|---|
| **Google Chat** | Posts to a Google Chat Space via webhook — the direct equivalent of Teams webhooks. | Create a Space in Google Chat. Space menu ▸ Apps & integrations ▸ Manage webhooks ▸ create one. Copy the URL into **Settings ▸ Google Chat spaces** as `[{"name":"My Alerts","url":"https://..."}]`. Select the space name in each rule. |
| **Google Calendar** | Creates a 15-minute calendar event with the alert details. Phone/desktop notifications fire automatically if you have calendar notifications on. | (Optional) Enter a calendar ID in Settings, or leave blank for your primary calendar. In the rule editor, check "Create a Google Calendar event on match." |
| **Google Sheets** | Appends a row (timestamp, rule, from, subject, received, message) to a spreadsheet. Great for audit trails, searching past alerts, sharing with a team. | (Optional) Enter a spreadsheet ID in Settings, or leave blank — MailAlert auto-creates one called "MailAlert — Alert Log" on the first alert. In the rule editor, check "Log to Google Sheets on match." |
| **Google Tasks** | Creates a task in Google Tasks with the alert subject and details. Shows in the Gmail sidebar and the Google Tasks app. | Leave the Tasks list ID blank for "My Tasks" (the default list). In the rule editor, check "Create a Google Task on match." |

Each Google channel is enabled per rule via a checkbox in the rule editor, so you can have some rules post to Chat and others log to Sheets, or combine all four.

---

## 10. Privacy and storage

| What | Where it lives |
|---|---|
| Your Gemini API key, SMS provider credentials, Chat webhook URLs, rules, seen-mail baseline, activity log | `PropertiesService.getUserProperties()` — per-user, per-script, private |
| Email contents (sender, subject, body excerpt, attachment names) | Sent to **Gemini** for evaluation; included in alert messages sent via the channels you enable. |
| Outgoing alert emails | Sent from your own Gmail account |
| Google Calendar events, Sheets rows, Tasks | Created in **your own** Google account |
| Google Chat messages | Posted to **your own** Chat Spaces via webhook URLs you configure |

Nothing is stored on any third-party server. The add-on has no backend. The Google-native channels (Calendar, Sheets, Tasks, Chat) all stay within your Google account.

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| "No Gemini API key configured" in the activity log | **Settings ▸ Gemini API key** — paste a key, then **Test Gemini** |
| "Label '…' fetch failed" | Make sure the label exists in Gmail with that exact name (case-insensitive). For nested labels use the full path with `/`, e.g. `Vendors/Invoices` |
| Alerts firing for old mail right after install | **Settings ▸ Reset baseline** — the next run will re-baseline every label |
| Twilio "HTTP 401" | Check Account SID / Auth Token; both come from the Twilio console |
| Twilio "21608" / "21211" | "From" number is not a verified Twilio number, or the destination isn't in E.164 format |
| Trigger doesn't seem to be running | Apps Script editor ▸ **Triggers** (left rail clock icon) — confirm `runMailCheck` is listed. If not, click **Start monitoring** again |
| Want to see exactly what the trigger did | **Activity log** card — newest entries first |

You can also peek at the trigger execution history in the Apps Script editor under **Executions** (left rail).

---

## 12. Why an Add-on instead of a Chrome extension?

A Chrome extension only runs while a Chrome tab is open. The original Python app was a background daemon — the equivalent in Google's world is an **Apps Script time-driven trigger**, which runs server-side on Google's infrastructure whether or not you have Gmail open. A Workspace Add-on bundles that trigger together with a Gmail-rail UI for managing rules and settings, which is exactly what MailAlert needs.

If you'd rather have an in-Gmail browser-only experience too, the same `.gs` files can also be deployed as a **Gmail Add-on web app** through Google Workspace Marketplace; the manifest is already compatible.

---

## 13. Legal

Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.

| Document | Description |
|---|---|
| [LICENSE](LICENSE) | Proprietary software license |
| [TERMS.md](TERMS.md) | Terms of Service |
| [PRIVACY.md](PRIVACY.md) | Privacy Policy (required for Google Workspace Marketplace) |
| [DISCLAIMER.md](DISCLAIMER.md) | Warranty disclaimer, AI accuracy, no-reliance notice |

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. See [DISCLAIMER.md](DISCLAIMER.md) and Section 9 of the [Terms of Service](TERMS.md) for details.
