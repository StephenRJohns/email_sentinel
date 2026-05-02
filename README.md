<p align="center"><img src="images/JStar_1024.png" width="80" alt="JJJJJ Enterprises, LLC"></p>

# emAIl Sentinel™

A Gmail Workspace Add-on that watches your Gmail for new messages and sends an alert when one matches a rule you describe in plain English. Rules are evaluated by **Google Gemini**.

Everything runs inside your Google account — no machine to keep running, no extra accounts to create.

> **Status: private pre-launch testing.** emAIl Sentinel is currently in private testing with a closed group of users. It is not yet listed on the Google Workspace Marketplace for general availability, and public sign-ups are not being accepted. The plan structure, pricing, and features documented below describe the product at launch; during private testing, access is invitation-only and free of charge. **At launch, the Service will be offered to United States users only** (see `legal/TERMS.md` § 2). EU/UK availability is deferred. See `legal/TERMS.md` § 1.1 for the governing pre-launch provision. For inquiries, contact [support@jjjjjenterprises.com](mailto:support@jjjjjenterprises.com).

---

## Table of contents

1. [What it does](#1-what-it-does)
2. [How it works](#2-how-it-works)
3. [Plans and pricing](#3-plans-and-pricing)
4. [Repository layout](#4-repository-layout)
5. [Prerequisites](#5-prerequisites)
6. [Install with `clasp`](#6-install-with-clasp)
7. [Install via the Apps Script editor (no CLI)](#7-install-via-the-apps-script-editor-no-cli)
8. [First-run configuration](#8-first-run-configuration)
9. [Writing rules](#9-writing-rules)
10. [Gemini pricing and model tiers](#10-gemini-pricing-and-model-tiers)
11. [Alert channels](#11-alert-channels)
12. [Privacy and storage](#12-privacy-and-storage)
13. [Troubleshooting](#13-troubleshooting)
14. [Why an Add-on instead of a Chrome extension?](#14-why-an-add-on-instead-of-a-chrome-extension)
15. [Legal](#15-legal)

---

## 1. What it does

When a new email arrives in a watched Gmail label, emAIl Sentinel asks Gemini whether it matches one of your rules. If it does, it fires the alerts you configured for that rule:

- **SMS** via your configured provider (bring your own — six quick-start presets plus a generic webhook for any other provider), to named recipients you define in Settings.
- **Google Chat**, **Google Calendar**, **Google Sheets**, **Google Tasks**, or **Google Docs** — all within your own Google account, no extra sign-up needed.
- **External integrations** — Microsoft Teams, Asana, any custom Model Context Protocol endpoint over HTTPS, or **any HTTPS webhook** (Slack incoming webhooks, Discord, n8n / Zapier / Make scenarios, custom internal APIs).

Rules are plain English. No regex, no code:

> *"If I get an email from any address at tma.com that has a PDF attachment that looks like an invoice or purchase order."*

---

## 2. How it works

```
┌──────────────────────────────────────────────────────────────┐
│  Apps Script time-driven trigger (chosen to divide pollMin)  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  runMailCheck()                                        │  │
│  │  • For each enabled rule's labels:                     │  │
│  │    – GmailApp.search() → recent messages               │  │
│  │    – Diff against per-label seen-ID set                │  │
│  │    – New messages × matching rules:                    │  │
│  │      → Gemini: does this match the rule?               │  │
│  │      → If YES: Gemini formats the alert message        │  │
│  │      → SMS / Chat / Cal / Sheets / Tasks / MCP server   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Add-on UI (Cards) — Rules, Settings, Activity log, Help     │
└──────────────────────────────────────────────────────────────┘
```

All state lives in `PropertiesService.getUserProperties()`:

| Key | Contents |
|---|---|
| `mailsentinel.settings` | Gemini key, model, poll interval, business hours, SMS config, alert channel IDs |
| `mailsentinel.rules`    | JSON array of rule objects |
| `mailsentinel.seen`     | Per-label list of recently-seen Gmail message IDs |
| `mailsentinel.log`      | Ring buffer of the last ~60 activity log lines |

`UserProperties` is **private to the running user** and **per-script** — nobody but you (and the add-on running in your account) can read it.

---

## 3. Plans and pricing

emAIl Sentinel is offered on a freemium model. It is designed for individuals, professionals, consultants, and small teams where each member installs the add-on in their own Google account.

| Feature | Free | Pro |
|---|---|---|
| Price | Free | **$4.99/month** or **$39/year** |
| Active rules | Up to **3** | Unlimited |
| Minimum automatic scan interval | Every **3 hours** | Every **1 hour** |
| Manual on-demand check (*Scan email now*) | ✅ | ✅ |
| Alert channels — Google Calendar, Sheets, Tasks, Docs | ✅ | ✅ |
| Alert channels — SMS (any provider — 6 quick-start presets plus generic webhook) | ✅ | ✅ |
| Alert channels — Google Chat webhook | — | ✅ |
| Alert channels — External integrations (MCP servers, Asana REST, generic HTTPS webhooks for Slack/Discord/n8n/etc.) | — | ✅ |
| AI-assisted alert content (*Help me write the alert text*) | ✅ | ✅ |
| AI-assisted rule writing (*Help me write the rule text*) | — | ✅ |
| Activity log retention | 30 days | Unlimited |
| Support | GitHub Issues + Community Discussions | GitHub Issues + Community Discussions |

**Founding-member lifetime tier** — $79 one-time for the first 500 buyers, then this tier is retired.

**About scan cadence:** Google Workspace enforces a **1-hour minimum** on time-based triggers in any Workspace add-on, regardless of plan or pricing — this is a Google platform limit, not a tier policy. Pro scans at the platform floor (every 1 hour); Free scans every 3 hours. Both plans support **Scan email now** on the home card (also available from the universal "⋮" menu) to run an immediate scan at any time, bypassing the cadence entirely.

**Why we don't poll faster (and why that's a feature, not a limitation):** It's technically possible to bypass the 1-hour Workspace limit by running our own backend that scans Gmail every minute and pushes results back into the add-on. We deliberately don't. Doing so would require storing your Gmail OAuth refresh tokens on our servers, routing every email's content through our infrastructure, and reading each message outside your own Google account. emAIl Sentinel runs **entirely inside your own Google account**: your email content never reaches our servers — we never see, store, or process it. The only places your email data ever goes are (1) the Google Gemini API, called with **your own** API key, and (2) the alert channels **you** configure (your SMS provider, your Calendar, your Sheets, your MCP server, etc.). The 1-hour scan-interval floor is the price of that privacy-first architecture, and we think it's worth paying.

Upgrading is done from the home card. Downgrading keeps all your rules intact; Chat and MCP channels are silently disabled and the scan interval is clamped back to the Free 3-hour minimum until you re-upgrade.

Enterprise-wide or centralized deployments across a Workspace domain are not supported; see [TERMS.md](legal/TERMS.md) §2 for the exact scope.

---

## 4. Repository layout

```
email_sentinel/
├── appsscript.json        # Add-on manifest (scopes, triggers, link prefixes)
├── .clasp.json            # clasp project config — paste your scriptId here
├── .claspignore           # Limits clasp push to .gs / .html / appsscript.json
├── .gitignore
│
├── Code.gs                # Entry points: onHomepage, universal actions, onUninstall
├── Cards.gs               # All CardService UI (home, rules, editor, settings, log, help)
├── MailWatcher.gs         # Time-driven trigger handler — polls Gmail, dispatches matches
├── RuleEvaluator.gs       # Gemini REST calls (rule evaluation + alert formatting)
├── AlertDispatcher.gs     # Alert dispatch: BYO SMS (presets + generic webhook), Chat, Calendar, Sheets, Tasks, Docs, MCP
├── McpServers.gs          # MCP server CRUD + JSON-RPC 2.0 tool dispatch
├── RulesManager.gs        # CRUD for rules in UserProperties
├── SettingsManager.gs     # CRUD for settings; business-hours helpers
├── ActivityLog.gs         # Ring-buffered activity log with batch-write support
│
├── README.md              # You are here
├── LICENSE                # Proprietary software license
│
├── images/                # Add-on icons and card banner
│   ├── ES_128.png         # 128×128 icon
│   ├── ES_32.png          # 32×32 icon
│   └── ES_Banner.png      # card banner
│
├── legal/                 # Legal source documents (markdown)
│   │                      # The HTML versions of these docs are generated
│   │                      # into the sibling repo ../jjjjjenterprises.com/
│   │                      # under emailsentinel/legal/ — this repo is the
│   │                      # source of truth.
│   ├── TERMS.md           # Terms of Service
│   ├── PRIVACY.md         # Privacy Policy (required for Google Workspace Marketplace)
│   └── DISCLAIMER.md      # Warranty disclaimer, AI accuracy, no-reliance notice
│
├── docs/                  # Developer and launch documentation
│   ├── pre_launch_todo.md        # Pre-launch tracker
│   ├── marketplace_checklist.txt # Google Workspace Marketplace listing guide
│   ├── rebuild_prompt.txt        # Reference: how to rebuild the project from scratch
│   ├── icon_prompts.txt          # Image-generation prompts for icon/banner
│   ├── trademark_filing_guide.pdf
│   └── oauth_verification/       # OAuth verification video + submission answers
│
├── scripts/               # Standalone helper scripts (not part of the add-on)
│   └── FoundingMemberMonitor.gs  # Daily watcher for founding-member sales count
│
└── testing/               # End-to-end test plan and Playwright automation
    ├── README.md
    ├── e2e_test_plan.md   # Canonical checklist
    ├── run_free_e2e_tests.sh  # Launch Chrome + run Free-tier suite
    ├── run_pro_e2e_tests.sh   # Wrapper that sets TEST_TIER=pro
    ├── reset_e2e_chrome.sh
    ├── new_manual_run.sh
    ├── archive_run.js     # Produces annotated per-run reports
    ├── diagnose.js        # Iframe introspector for debugging selector drift
    └── playwright/        # Playwright project (copy e2e.config.env.example → e2e.config.env)
```

There is no build step, no `requirements.txt`, no installer. The whole thing is JavaScript that runs on Google's servers.

---

## 5. Prerequisites

- A Google account (personal Gmail or Google Workspace).
- A free **Gemini API key** from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
- (Optional) An SMS provider account for SMS alerts — see [Alert channels](#11-alert-channels) for the six supported providers.
- For the `clasp` install path: [Node.js 18+](https://nodejs.org) and `npm`.

---

## 6. Install with `clasp`

`clasp` is Google's CLI for pushing local Apps Script files into a project.

```bash
# 1. Install clasp once, globally
npm install -g @google/clasp

# 2. Log in to your Google account in the browser that pops up
clasp login

# 3. From this directory, create a new Apps Script project
clasp create --type standalone --title "emAIl Sentinel" --rootDir .
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
5. Open Gmail in another tab — the emAIl Sentinel icon appears in the right-hand add-on rail.

---

## 7. Install via the Apps Script editor (no CLI)

If you'd rather not install `clasp`:

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. In the file tree on the left, create a file for each `.gs` and `.html` in this repo and paste in its contents. Replace the auto-created `Code.gs` with this repo's `Code.gs`.
3. Click the gear ▸ **Project Settings** ▸ check **Show appsscript.json** ▸ then open `appsscript.json` and replace its contents with this repo's `appsscript.json`.
4. **Deploy ▸ Test deployments ▸ Install** as in step 5 of the `clasp` flow above.

---

## 8. First-run configuration

After installation, open Gmail and click the emAIl Sentinel icon in the right rail.

1. **Settings ▸ Gemini API key** — paste your key. Click **Test Gemini** to confirm it works.
2. **Settings ▸ Scan schedule** — pick how often to check. The dropdown offers whole-hour intervals (`1 hour`, `2 hours`, `3 hours`, `4 hours`, `6 hours`, `8 hours`, `12 hours`, `24 hours`). Free shows `3 hours` and longer; Pro adds `1 hour` and `2 hours` at the top. The 60-minute limit is a Google Workspace add-on platform limit and cannot be bypassed. Use **Scan email now** for an immediate scan anytime regardless of plan.
3. **Settings ▸ SMS provider** *(optional)* — choose a provider and fill in credentials. Click **SMS setup guide** for a comparison. Then add named SMS recipients (e.g. "On-call", "CFO") below the provider fields — rules pick recipients by name, not raw phone numbers.
4. **Settings ▸ External integrations** *(optional)* — add Microsoft Teams, Asana (REST or MCP V2), any custom MCP endpoint (Cloudflare Worker, self-hosted bridge, etc.), or any HTTPS webhook URL (Slack incoming, Discord, n8n / Zapier, custom internal APIs).
5. **Settings ▸ Save settings**.
6. **Rules ▸ + New rule** — give it a name, list one or more Gmail labels (e.g. `INBOX`), describe the match in plain English, and tick the channels you want (SMS recipients, Chat spaces, MCP servers, Calendar, Sheets, Tasks). Click **Help me write the rule text** or **Help me write the alert text** to have Gemini draft a starting point. Or click **Starter rules** on the home card to create 5 pre-built rules (urgent emails, invoices, shipping updates, security alerts, and subscription renewals) — they are created disabled so you can tick channels and enable them at your own pace.
7. Back on the home card, pick a scan interval from the **Scan email every** dropdown (defaults to your tier minimum — every 3 hours on Free, every 1 hour on Pro), then click **Start scheduled scans**. This installs a time-driven trigger that runs in the background even when Gmail is closed and saves the chosen interval into Settings.

The **first** check for any new label is treated as a baseline (no alerts) so you don't get a flood of notifications for existing mail. Alerts start with the next new message.

---

## 9. Writing rules

Rules are evaluated by Gemini against:

- the sender,
- the subject,
- the first 2,000 characters of the body,
- and the **filenames** of any attachments.

Attachment **contents** are not read.

Good examples:

- `"Any email from anyone @example.com that has a PDF attachment that looks like an invoice or purchase order."`
- `"Subject contains URGENT or CRITICAL."`
- `"Email from boss@example.com asking for a status update."`
- `"Automated notification about a server being down or an alert being triggered."`

Each rule also has an **Alert message content** field — plain-English instructions Gemini uses to compose the alert message itself. The default produces a date / sender / subject / summary / action items block; override it per rule when you want something different (a one-liner, a bullet list, …). The **Help me write the rule text** and **Help me write the alert text** buttons in the rule editor let Gemini draft either field for you based on the rule name, labels, and the channels you've ticked.

### Rule examples by alert channel

Every rule works with every channel — just enable the ones you want in the rule editor. Here are real-world examples showing which channels make sense for each use case.

#### SMS alerts — urgent, time-sensitive notifications

| Use case | Rule | Alert format | Channels |
|---|---|---|---|
| **Server down** | "Any automated email about a server outage, service degradation, or critical alert from our monitoring system." | "One line: service name, severity, and what's affected." | SMS to the on-call engineer |
| **Wire transfer** | "Email from the bank confirming a wire transfer, ACH payment, or large transaction over $10,000." | "Amount, sender/recipient, and date only." | SMS to the CFO |
| **Security alert** | "Any email about a failed login attempt, password reset request, or suspicious activity on any of our accounts." | "Which account, what happened, and when." | SMS to security team |

#### Google Chat alerts — team-visible notifications

| Use case | Rule | Alert format | Channels |
|---|---|---|---|
| **Sales lead** | "Any email from a new contact (not in our company domain) that mentions pricing, demo, trial, or buying." | "Company name, contact name, what they're interested in, and their email." | Chat → "Sales Leads" space |
| **Support escalation** | "Any email with subject containing ESCALATION, P1, or CRITICAL from a customer." | "Customer name, issue summary, and severity." | Chat → "Support Escalations" |
| **Shipping notification** | "Email from FedEx, UPS, USPS, or DHL with a tracking number or delivery confirmation." | "Carrier, tracking number, and expected delivery date." | Chat → "Office Operations" space |

#### Google Calendar alerts — time-based follow-ups and phone notifications

| Use case | Rule | Alert format | Channels |
|---|---|---|---|
| **Meeting request** | "Any email asking me to schedule a meeting, call, or demo." | "Who's asking, what they want to meet about, and any suggested times." | Calendar event |
| **Deadline reminder** | "Any email that mentions a deadline, due date, or 'by end of day/week'." | "What's due, when, and who's asking." | Calendar event |
| **Travel itinerary** | "Emails from airlines, hotels, or booking services with a confirmation or itinerary." | "Confirmation number, dates, and location." | Calendar event + Sheets log |

#### Google Sheets alerts — audit trails, reporting, and team visibility

| Use case | Rule | Alert format | Channels |
|---|---|---|---|
| **Compliance log** | "Any email from a regulatory body, auditor, or containing 'compliance', 'audit', or 'regulation'." | "Date, sender, subject, and a one-sentence summary." | Sheets log |
| **Expense tracking** | "Emails containing receipts, invoices, or payment confirmations." | "Vendor, amount, date, and category." | Sheets log |
| **Hiring pipeline** | "Any email from job candidates or recruiting platforms." | "Candidate name, position applied for, and current stage." | Sheets log + Chat → "Hiring" space |

#### Google Tasks alerts — to-do items that need follow-up

| Use case | Rule | Alert format | Channels |
|---|---|---|---|
| **Action item catcher** | "Any email that explicitly asks me to do something, review something, or approve something." | "What's being asked, by whom, and any deadline." | Task |
| **Contract review** | "Email with an attachment that looks like a contract, NDA, agreement, or legal document." | "From whom, document type, and any stated deadline." | Task |
| **Follow-up needed** | "Any email where someone says 'let me know', 'please confirm', 'get back to me', or 'awaiting your response'." | "Who's waiting, what they need, and when they sent it." | Task |

#### Combining multiple channels on one rule

The real power is mixing channels:

- **Critical vendor issue:** Rule: *"Email from any @example.com address marked urgent or mentioning an outage."* → SMS (instant phone buzz) + Chat "Client Escalations" (team sees it) + Calendar event (blocks your time) + Sheets (audit trail)
- **New hire onboarding:** Rule: *"Email from HR containing 'new hire', 'onboarding', or 'start date'."* → Task (to-do list) + Sheets (track all new hires) + Chat "People Ops" (team visibility)
- **Legal filing deadline:** Rule: *"Email from outside counsel or the court mentioning a filing deadline or hearing date."* → Calendar event (date on your calendar) + Task (action item) + SMS (don't miss it) + Sheets (matter log)

---

## 10. Gemini pricing and model tiers

emAIl Sentinel calls the Gemini API **twice per new email per active rule**: once to evaluate whether the email matches, and once to format the alert message. Already-seen messages are skipped entirely.

### Models (select in Settings)

| Model | Speed | Free quota | Paid input cost | Paid output cost | Best for |
|---|---|---|---|---|---|
| **Gemini 2.5 Flash** *(default)* | Fast | 1,500 req/day · 1M tokens/day | ~$0.075 / 1M tokens | ~$0.30 / 1M tokens | Most users — best balance of speed, cost, and accuracy |
| **Gemini 2.5 Flash Lite** | Fastest | 1,500 req/day · 1M tokens/day | ~$0.04 / 1M tokens | ~$0.15 / 1M tokens | Simple rules at very high volume; slightly less capable |
| **Gemini 2.5 Pro** | Slower | 50 req/day | ~$1.25 / 1M tokens | ~$5.00 / 1M tokens | Complex or nuanced rules where accuracy is critical; not suited for high email volume |
| **Gemini 2.0 Flash 001** | Fast | 1,500 req/day · 1M tokens/day | ~$0.075 / 1M tokens | ~$0.30 / 1M tokens | Stable previous-generation Flash — fallback if 2.5 Flash behaviour changes |

> Verify current prices at [ai.google.dev/pricing](https://ai.google.dev/pricing). Prices shown are as of April 2026 and may change.

### Free tier (no billing required)

A key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) is free — no credit card required. Flash model free limits reset daily at midnight Pacific Time:

- **Flash models:** 1,500 requests/day and 1,000,000 tokens/day
- **Pro models:** 50 requests/day

When you hit a limit, Gemini returns HTTP 429 and emAIl Sentinel logs `"Gemini quota exceeded"` in the Activity Log. Scanning resumes automatically the next day — you are never charged on a free key.

### Estimating your daily usage

**Gemini calls per day ≈ new emails/day × active rules × 2**

Each call consumes roughly 600–1,500 tokens depending on email length and the complexity of your alert format prompt.

| Scenario | New emails/day | Active rules | API calls/day | Tokens/day (est.) | Free tier? |
|---|---|---|---|---|---|
| Light personal | 20 | 1 | 40 | ~50K | Well within |
| Typical personal | 50 | 3 | 300 | ~375K | Well within |
| Power user | 100 | 5 | 1,000 | ~1.25M | At / over limit — consider billing |
| Small business | 200 | 10 | 4,000 | ~5M | Needs paid tier |
| High volume | 500 | 20 | 20,000 | ~25M | Needs paid tier |

### Enabling paid usage

If you regularly hit the free limit:

1. Go to [aistudio.google.com](https://aistudio.google.com) → select your API key → **Enable billing**.
2. Link a Google Cloud project that has a billing account attached.
3. The same API key continues to work in emAIl Sentinel — no settings change needed.

**Example monthly cost (Flash model, paid tier):**

| Usage | Input tokens/mo | Input cost | Output tokens/mo | Output cost | Monthly total |
|---|---|---|---|---|---|
| Typical personal (50 emails/day × 3 rules) | ~7M | ~$0.53 | ~1M | ~$0.30 | **~$0.83** |
| Power user (100 emails/day × 5 rules) | ~23M | ~$1.73 | ~4M | ~$1.20 | **~$2.93** |
| Small business (200 emails/day × 10 rules) | ~90M | ~$6.75 | ~14M | ~$4.20 | **~$10.95** |

> These are rough upper bounds. Emails that don't match a rule still cost one evaluation call; alerts that fire cost a second (formatting) call. Most rules match only a small fraction of emails, so real costs are typically lower.

### Tips to reduce Gemini spend

- **Enable Business hours** — restricts checks to your configured time window (supports overnight windows too).
- **Lower Max email age** (Settings ▸ Scan schedule) — default is 30 days; reducing it skips older messages entirely so they never hit Gemini.
- **Watch specific labels** (e.g. `Vendors/Invoices`) instead of INBOX — only emails in that label are evaluated against the rule.
- **Combine conditions** — one rule "Invoice OR purchase order from any vendor" is cheaper than two separate rules.
- **Keep alert format prompts short** — concise format instructions produce shorter output responses and lower output-token costs.
- **Raise the scan interval** — pick a longer interval in the Scan schedule dropdown (e.g. every 6 or 12 hours) instead of the tier minimum to reduce Gemini calls proportionally when email arrives in bursts.

---

## 11. Alert channels

### SMS
Google Workspace does not provide a first-party SMS API. emAIl Sentinel supports **any SMS provider you want** — ships with six quick-start presets (below) and a generic webhook for everything else. Click **SMS setup guide** in the add-on Settings for a comparison table with sign-up links and step-by-step instructions.

| Provider | Phone # needed? | Free trial? | Auth method |
|---|---|---|---|
| **Textbelt** | No | 1 free/day (key: `textbelt`) | API key |
| **Telnyx** | Yes | Free credits | Bearer token |
| **Plivo** | Yes | $10 free credit | Basic auth |
| **Twilio** | Yes | $15 free credit | Basic auth |
| **ClickSend** | No | Free trial credits | Basic auth |
| **Vonage** | No | Free credits (no CC) | API key + secret |
| **Generic webhook** | (your choice) | N/A | (your choice) |

> **Prices vary by provider and change over time.** Current per-SMS and phone-number costs are shown in the in-app **SMS setup guide** and on each provider's website. Use the sign-up links in Settings to verify current rates before committing.

**How to choose:**
- **Quickest start (no sign-up):** Textbelt with the free key `textbelt` — 1 free SMS/day, no account needed.
- **Cheapest at scale:** Telnyx or Plivo (both sub-cent per US SMS, require you to rent a number).
- **No phone number to manage:** Textbelt, ClickSend, or Vonage send from a shared/system number.
- **Most popular / best docs:** Twilio.
- **Already have an SMS gateway or want to use an unlisted provider:** Generic webhook POSTs `{"to": "+15551234567", "body": "..."}` to any HTTPS URL you configure.

Phone numbers in SMS recipients should be in [E.164 format](https://en.wikipedia.org/wiki/E.164): `+15551234567`.

SMS recipients are managed in one place — **Settings ▸ SMS recipients** — as named entries (e.g. `On-call = +15551234567`). Rules pick recipients by name via checkboxes, so you don't paste phone numbers into each rule.

After configuring a provider in Settings, click **Send test SMS** to verify it works.

**A2P 10DLC compliance:** SMS providers (especially Twilio) require A2P 10DLC (Application-to-Person 10-Digit Long Code) registration for US phone numbers. After buying a number from your provider, register a campaign in their console (typically under A2P 10DLC or Messaging → Campaigns). The app provides guidance if registration is missing — you'll see an error directing you to complete the registration before SMS can be sent.

### Google-native channels (free)

These use your existing Google account — no third-party sign-up, no cost.

| Channel | What it does | How to set up |
|---|---|---|
| **Google Chat** | Posts to a Google Chat Space via webhook — the direct equivalent of Teams webhooks. **Requires a Google Workspace paid account** (webhooks are not available on free Gmail accounts). Pro plan only. | Create a Space at [chat.google.com](https://chat.google.com). Open the space, click the space name in the top header bar ▸ Apps & integrations ▸ Webhooks ▸ create one. In **Settings ▸ Google alert channels**, click "Add Chat space", enter the space name, and paste the webhook URL. Select the space name in each rule. |
| **Google Calendar** | Creates a 15-minute calendar event with the alert details. Phone/desktop notifications fire automatically if you have calendar notifications on. | (Optional) Enter a calendar ID in Settings, or leave blank for your primary calendar. In the rule editor, check "Create a Google Calendar event on match." |
| **Google Sheets** | Appends a row (timestamp, rule, from, subject, received, message) to a spreadsheet. Both date columns are written in the user's local timezone (`yyyy-MM-dd h:mm:ss AM/PM TZ`) — never UTC/Zulu. Great for audit trails, searching past alerts, sharing with a team. | (Optional) Enter a spreadsheet ID in Settings, or leave blank — emAIl Sentinel auto-creates one called "emAIl Sentinel — Alert Log" on the first alert. In the rule editor, check "Log to Google Sheets on match." |
| **Google Tasks** | Creates a task in Google Tasks with the alert subject and details. Shows in the Gmail sidebar and the Google Tasks app. | Leave the Tasks list ID blank for "My Tasks" (the default list). In the rule editor, check "Create a Google Task on match." |

Each Google channel is enabled per rule via a checkbox in the rule editor, so you can have some rules post to Chat and others log to Sheets, or combine all four.

### External integrations (MCP servers + Asana REST)

emAIl Sentinel can call any endpoint that speaks the [Model Context Protocol](https://modelcontextprotocol.io) (JSON-RPC 2.0 over HTTPS), and additionally offers a direct Asana REST path for the simplest Asana-task-creation case. Configure entries once in **Settings ▸ External integrations** and then tick them per rule.

| Type | What it does | Tool name (preset) |
|---|---|---|
| **Custom** *(recommended starting point)* | Any HTTPS MCP server — Cloudflare Worker, self-hosted bridge to Slack, your own internal tools. The Help card has a 40-line Cloudflare Worker walkthrough that gets you a working endpoint in about 15 minutes. | (you define, e.g. `log_alert`) |
| **Microsoft Teams** | Sends a Teams chat or channel message via a Microsoft Graph MCP server. Requires Entra ID app registration + OAuth (admin consent often required in enterprise tenants). | `send_message` |
| **Asana (REST API — easier)** | Direct Asana REST task creation — strictly speaking not MCP, but the simplest way to create Asana tasks. PAT-based, no OAuth flow. | (unused — direct REST) |
| **Asana (MCP V2 — requires OAuth)** | Creates a task via the official Asana MCP V2 gateway. Requires OAuth-issued access tokens (PATs are rejected). | `asana_create_task` |

For each server you configure:
- **Endpoint** — the MCP server's HTTPS URL
- **Auth token** — the `Authorization` header value (e.g. `Bearer sk-…`)
- **Tool name** — the MCP tool to call (preset by type; overrideable)
- **Tool args template** — JSON with `{{message}}`, `{{subject}}`, `{{from}}`, `{{rule}}` placeholders that emAIl Sentinel fills in at dispatch time

Click **Load defaults** when editing a server to populate the tool name and args template for the selected type.

---

## 12. Privacy and storage

| What | Where it lives |
|---|---|
| Your Gemini API key, SMS provider credentials, Chat webhook URLs, rules, seen-mail baseline, activity log | `PropertiesService.getUserProperties()` — per-user, per-script, private |
| Email contents (sender, subject, body excerpt, attachment names) | Sent to **Gemini** for evaluation; included in alert messages sent via the channels you enable. |
| Google Calendar events, Sheets rows, Tasks | Created in **your own** Google account |
| Google Chat messages | Posted to **your own** Chat Spaces via webhook URLs you configure |

Nothing is stored on any third-party server. The add-on has no backend. The Google-native channels (Calendar, Sheets, Tasks, Chat) all stay within your Google account.

---

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| "No Gemini API key configured" in the activity log | **Settings ▸ Gemini API key** — paste a key, then **Test Gemini** |
| "Label '…' fetch failed" | Make sure the label exists in Gmail with that exact name (case-insensitive). For nested labels use the full path with `/`, e.g. `Vendors/Invoices` |
| Alerts firing for old mail right after install | **Settings ▸ Reset baseline** — the next run will re-baseline every label |
| SMS "HTTP 401" or auth error | Re-check your provider credentials in **Settings ▸ SMS provider**; both key fields must be saved |
| SMS "invalid from number" or delivery failure | Ensure the From number is provisioned on your provider account and the To number is in E.164 format (`+15551234567`) |
| MCP target system (Asana/Slack/Teams/etc.) not populated, but no error in the activity log | The dispatcher now surfaces tool-level MCP errors as `MCP alert to "<name>" FAILED: MCP "<name>" tool error: <detail>`. If you used to see no log line at all, push the latest code — earlier versions silently swallowed errors when the MCP server returned a Streamable-HTTP `text/event-stream` response (e.g. Asana V2 at `https://mcp.asana.com/v2/mcp`). Common detail texts: *Project not found* (bad `project_id`), *Forbidden* (PAT lacks workspace access), *Required field missing* (args template missing a required field). |
| MCP `Authorization` header rejected | Asana V2 / Slack / Teams expect the literal `Bearer <token>` (capital B, single space, then PAT). Pasting just the token without `Bearer ` produces an HTTP 401 in the activity log |
| Activity log times look "off" by several hours | Activity-log timestamps are now in 12-hour AM/PM in your local timezone (taken from your primary Google Calendar). If your Calendar's timezone is wrong, fix it in [calendar.google.com](https://calendar.google.com/calendar/u/0/r/settings) ▸ Time zone — emAIl Sentinel inherits that setting on the next run |
| Sheets row Timestamp / Received columns show `…Z` UTC strings | You're on an older deployment. Push the latest code — both columns now render as `yyyy-MM-dd h:mm:ss AM/PM TZ` in your local Calendar timezone |
| "Manage add-on" opens the Apps Script editor source code | This is identity-aware. As the add-on **owner / developer**, Google routes "Manage add-on" to the Apps Script editor. **End users** who installed the add-on from the Workspace Marketplace get the standard consumer dialog (uninstall, view permissions, manage data access) instead. To preview the consumer experience, install the published Marketplace listing on a separate Google account that doesn't own the script |
| Trigger doesn't seem to be running | Apps Script editor ▸ **Triggers** (left rail clock icon) — confirm `runMailCheck` is listed. If not, return to the home card and click **Start scheduled scans** again |
| Want to see exactly what the trigger did | **Activity log** card — newest entries first |

You can also peek at the trigger execution history in the Apps Script editor under **Executions** (left rail).

### Where to ask for help

- [**Community Discussions**](https://github.com/StephenRJohns/email_sentinel/discussions) — usage questions, rule-writing tips, sharing setups for SMS / Chat / MCP. Browse what other users are doing.
- [**GitHub Issues**](https://github.com/StephenRJohns/email_sentinel/issues) — bugs and feature requests; the developer monitors these directly.

Both are linked from inside the add-on: **Help** card → support links, and the kebab "⋮" menu → **Community discussions**. The home card also has a **Community** button next to **Help**.

---

## 14. Why an Add-on instead of a Chrome extension?

A Chrome extension only runs while a Chrome tab is open. emAIl Sentinel needs to scan Gmail continuously in the background — the right primitive for that is an **Apps Script time-driven trigger**, which runs server-side on Google's infrastructure whether or not you have Gmail open. A Workspace Add-on bundles that trigger together with a Gmail-rail UI for managing rules and settings.

If you'd rather have an in-Gmail browser-only experience too, the same `.gs` files can also be deployed as a **Gmail Add-on web app** through Google Workspace Marketplace; the manifest is already compatible.

---

## 15. Legal

Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.

| Document | Description |
|---|---|
| [LICENSE](LICENSE) | Proprietary software license |
| [TERMS.md](legal/TERMS.md) | Terms of Service |
| [PRIVACY.md](legal/PRIVACY.md) | Privacy Policy (required for Google Workspace Marketplace) |
| [DISCLAIMER.md](legal/DISCLAIMER.md) | Warranty disclaimer, AI accuracy, no-reliance notice |

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. See [DISCLAIMER.md](legal/DISCLAIMER.md) and Section 9 of the [Terms of Service](legal/TERMS.md) for details.

---

Google, Gmail, Google Workspace, Google Chat, Google Calendar, Google Sheets, Google Tasks, and Gemini are trademarks of Google LLC. This project is not affiliated with or endorsed by Google.
