# emAIl Sentinel — Marketplace Screenshot Guide

Five screenshots for the Google Workspace Marketplace listing.

## Google Workspace Marketplace requirements

| Field | Requirement |
|---|---|
| Pixel dimensions | **1280 × 800 exactly** |
| Format | PNG or JPEG |
| Count | 3 minimum, **5 maximum** |
| Content | No device frames, no rounded-corner overlays on the raw upload |
| Captions | Up to 100 characters each (entered in the Marketplace console, not baked into the image) |

---

## Browser setup — set the Chrome window to exactly 1280 × 800

### Option A — Launch Chrome at the right size from the terminal (recommended)

Open Chrome with the window pre-sized so the inner viewport is exactly 1280 × 800:

```bash
google-chrome --window-size=1280,800 "https://mail.google.com"
```

On some Linux desktops the window manager adds a few pixels of decoration. If the viewport is off, use the DevTools console to correct it (see Option C below).

### Option B — Resize an open window with wmctrl (Linux)

If Chrome is already open, resize it from the terminal without reopening it:

```bash
wmctrl -r :ACTIVE: -e 0,-1,-1,1280,800
```

Make sure the Chrome window is focused before running the command. `-1,-1` preserves the current position; the last two values set width × height of the outer window frame.

### Option C — Resize from the DevTools console (any platform)

Open DevTools (**F12**), switch to the **Console** tab, and run:

```javascript
window.resizeTo(
  1280 + (window.outerWidth  - window.innerWidth),
  800  + (window.outerHeight - window.innerHeight)
);
```

This compensates for the browser chrome (title bar, toolbar) so the inner viewport lands on exactly 1280 × 800.

### Option D — DevTools responsive mode (viewport-only, no OS resize)

Use this when you want the capture to be exactly 1280 × 800 regardless of the OS window size.

1. Open Chrome and navigate to Gmail (signed into your screenshot demo account).
2. Open DevTools: **F12** (or Ctrl+Shift+I on Linux/Windows, Cmd+Option+I on Mac).
3. Click the **Toggle device toolbar** icon (phone/tablet icon, top-left of DevTools) — or press **Ctrl+Shift+M**.
4. In the toolbar that appears above the page, set the dimensions to **1280** (width) × **800** (height). Type directly into the W and H fields; press Tab between them.
5. Set zoom to **100%** in the DevTools device toolbar dropdown (not the browser zoom).
6. To capture: open the DevTools command palette with **Ctrl+Shift+P**, type `screenshot`, and choose **Capture screenshot**. Chrome saves a PNG at exactly the viewport dimensions — no manual cropping needed.

> **Tip:** If the Gmail sidebar collapses at 1280 wide, drag DevTools to undock it as a separate window so the viewport is not sharing horizontal space with the DevTools panel.

---

## Before shooting

Enable screenshot mode and configure your local redactions. See `ScreenshotMode.gs` for the toggle (`setScreenshotModeOn`) and the `configureMyScreenshotRedactions` stub for the real-PII → demo-PII pairs that get scrubbed from email body / subject content.

Use a dedicated demo Gmail account for the screenshots so no real recipient names appear in the Gmail chrome itself.

---

## Shot 1 — Hero: home card after a successful scan

**Goal:** Communicate the app's purpose at a glance. This is the image Marketplace shows first and largest — spend the most effort here.

**Capture:** Trigger a scan in screenshot mode so the green "Found 1 new alert" result banner is visible. Show the full Gmail chrome + emAIl Sentinel sidebar: logo, Pro badge, poll-interval status, "Scan email now" button, and the scan result banner.

**Suggested caption:** `Watch your inbox for what matters — AI-powered Gmail alerts`

---

## Shot 2 — Rule editor: plain-English rule creation

**Goal:** Show that rule-writing is plain English, not a regex.

**Capture:** Open the rule editor with a realistic rule filled in. Suggested rule: "Critical security alerts from AWS or Cloudflare" with Labels set to Inbox and Channels set to Calendar. Scroll or composite so the Rule name, Rule text, and at least one alert channel are all visible at once. Use the AWS GuardDuty sample email (Example A below) as the source rule.

**Suggested caption:** `Write rules in plain English — Gemini AI does the matching`

---

## Shot 3 — Alert in the wild: the payoff moment

**Goal:** Show the visceral payoff — an alert arriving in the user's calendar or phone.

**Capture:** Pick the most visually striking channel you have configured:
- **Google Calendar event** (recommended) — shows AI-generated summary, due dates, and action items in the event description; easy to capture at full width without a phone mockup.
- **SMS phone mockup** (highest impact) — wrap an SMS screenshot in a device frame at mockuphone.com before uploading to Marketplace.
- **Google Chat message** — shows the formatted alert card in the chat stream.

**Suggested caption:** `Alerts delivered to Calendar, Chat, SMS, Sheets, Tasks, or your own webhook`

---

## Shot 4 — Channel breadth: all six alert destinations

**Goal:** Communicate flexibility — this is not just an SMS tool.

**Capture:** Open the rule editor's Alert Channels section showing all channel options (SMS, Google Chat, Calendar, Sheets, Tasks, External integrations). Or build a 1280×800 composite in Figma / GIMP: place the channel-selection card on the left half with a soft brand-purple background and a label listing all six channel names on the right.

**Suggested caption:** `Six alert channels — bring your own SMS provider or MCP server`

---

## Shot 5 — Activity log: proof it works

**Goal:** Build trust by showing the audit trail.

**Capture:** Open the Activity Log card with 8–12 entries visible. Mix of "matched" and "no match" lines. At least one entry should show a real-looking matched rule name and a demo sender (screenshot mode handles the From field automatically). Keep timestamps realistic (today's date, staggered by 10–30 minutes).

**Suggested caption:** `Full audit trail — see exactly what was scanned and why it matched`

---

## Capture checklist

- [ ] Screenshot mode ON (`setScreenshotModeOn` in Apps Script editor)
- [ ] `configureMyScreenshotRedactions` run with your real-PII pairs
- [ ] Demo Gmail account signed in (no real names visible in Gmail chrome)
- [ ] DevTools viewport set to **1280 × 800**, zoom **100%**
- [ ] DevTools undocked or docked to bottom so full width is available
- [ ] All five shots captured via Ctrl+Shift+P → "Capture screenshot"
- [ ] File names match shot order before uploading (e.g., `01_hero.png`, `02_rule_editor.png`, …)
- [ ] Screenshot mode OFF after shooting (`setScreenshotModeOff`)

---

## Sample test emails

These trigger any rule whose subject filter matches `SENTINEL_TEST`. The bodies are fully fabricated — no real account numbers, IPs, finding IDs, or people. They produce rich Chat / Calendar / Tasks alerts because Gemini has plenty of structured fields to extract.

Set the **From** of the email you send yourself to the value listed under each example. (In Gmail you can spoof this only if you use Send-As / SMTP relay; otherwise the From will be your own address — screenshot mode will overwrite it with `Tester <test@example.com>`.)

---

### Example A — AWS GuardDuty security alert

**From:** `noreply@security.aws.amazon.com`

**Subject:**
```
[ALERT] SENTINEL_TEST — Unusual sign-in attempt blocked on AWS root account
```

**Body:**
```
SECURITY EVENT NOTIFICATION

Severity:        HIGH
Event ID:        gd-finding-9c8a5b22-f1e3-44a7-bc91-d4e8a2f7c8b4
Detected:        Apr 29, 2026 at 1:42 PM CDT
AWS Account:     412358907612 (jjjjj-prod)
Region:          us-east-1
Resource:        IAMUser/root
Source IP:       45.227.255.219 (Bucharest, Romania)
ISP:             FlokiNET srl

DESCRIPTION
A console sign-in to the AWS root account was attempted from an IP address
not previously associated with this account. Multi-factor authentication
prevented the sign-in. The attempt originated from a hosting provider
frequently associated with credential-stuffing activity.

REQUEST DETAILS
- User agent:    Mozilla/5.0 (X11; Linux x86_64) curl/8.4.0
- MFA used:      YES (TOTP rejected after 3 failed codes)
- Outcome:       Sign-in BLOCKED

RECOMMENDED ACTIONS
1. Review CloudTrail logs around the timestamp above for related activity.
2. Rotate the root account password and confirm MFA device integrity.
3. Confirm no IAM access keys were created in the past 24 hours.

Open this finding in GuardDuty:
https://console.aws.amazon.com/guardduty/home?region=us-east-1#/findings

— AWS Security Hub
   Do not reply to this message.
```

**Why this works:** High severity + clear stakes; concrete fields (IP, location, resource, time) for Gemini to surface; realistic source name and plausible-looking IDs.

---

### Example B — Stripe failed payment

**From:** `notifications@stripe.com`

**Subject:**
```
[Stripe] SENTINEL_TEST — Payment failed: $4,850.00 from Northwind Technologies
```

**Body:**
```
A subscription payment did not go through.

────────────────────────────────────────
PAYMENT DETAILS
────────────────────────────────────────
Amount:           $4,850.00 USD
Customer:         Northwind Technologies
                  accounts@northwind-tech.example
Invoice:          INV-2026-04-2188
Subscription:     Enterprise Annual (sub_1QyL8mH7kTfzN3aR)
Attempted:        Apr 29, 2026 at 10:22 AM CDT
Reason:           card_declined — insufficient_funds
Card on file:     Visa •••• 4242 (exp 09/26)
────────────────────────────────────────

This was the 1st of 4 automatic retries. Stripe will retry on:
  • Apr 30  (24 hr)
  • May 2   (72 hr)
  • May 6   (7 days)

If all four retries fail, the subscription will be marked unpaid on
May 6 and the customer will lose access to your service.

Northwind Technologies has been an active customer for 14 months and
represents $58,200 in annual recurring revenue.

RECOMMENDED ACTIONS
1. Reach out to Northwind directly to update the card on file.
2. Or, send them the customer portal link to self-update:
   https://billing.stripe.com/p/session/test_YWNjdF8xR3pQOExINHpx
3. Pause dunning if you have worked out an alternative payment plan.

Manage this invoice:
https://dashboard.stripe.com/invoices/in_1QyL8mH7kTfzN3aR

— Stripe
   support@stripe.com
```

**Why this works:** Different stakes (revenue, not security) — broadens the "useful for" signal in screenshots. Specific dollar amounts, named customer, and a multi-stage retry schedule that gives Gemini concrete Due Dates content to extract.

---

### Example C — DocuSign contract deadline

**From:** `dse@docusign.net`

**Subject:**
```
[DocuSign] SENTINEL_TEST — Action required: Master Services Agreement awaiting your signature (expires May 6)
```

**Body:**
```
Tester,

You have a document waiting for your signature.

────────────────────────────────────────
DOCUMENT DETAILS
────────────────────────────────────────
Document:        Master Services Agreement — JJJJJ Enterprises ↔ Acme Corp
Sent by:         Patricia Reyes <preyes@acmecorp.example>
                 General Counsel, Acme Corp
Sent on:         Apr 29, 2026 at 9:08 AM CDT
Envelope ID:     ed7c2a6e-4f88-4d11-bf90-c8a2f6e1d3b5
Pages:           18
Reminder:        2nd of 3 (final reminder will be sent May 4)

────────────────────────────────────────
KEY DATES
────────────────────────────────────────
Signature deadline:       May 6, 2026 at 5:00 PM PT
Effective date:           May 7, 2026
Initial term ends:        May 6, 2028 (24 months)
First invoice due:        May 21, 2026 ($24,000 — Year 1 prepayment)
Renewal review window:    Mar 6 – Apr 6, 2028 (60-day notice period)

If not signed by May 6, 2026 at 5:00 PM PT, the envelope will expire
automatically and Acme will need to re-send a new agreement. The pricing
quoted in the attached MSA is held only through that date.

────────────────────────────────────────
WHAT CHANGED FROM v3 (negotiated last week)
────────────────────────────────────────
- §4.2 — Liability cap raised from 1× fees to 2× fees
- §7.1 — Data residency clause added (US only)
- §11   — Mutual indemnification language updated per your redline

REVIEW & SIGN
https://www.docusign.net/Signing/EmailStart.aspx?ti=ed7c2a6e

— DocuSign
   Do not share this link.
```

**Why this works:** Five explicit dated deadlines packed into one email — the densest "Due Dates" payload of the three. Use this one when you want a Chat alert screenshot showing a fully populated Due Dates section.

> **Note on the salutation:** the body now uses "Tester," as the salutation so it is safe to use without configuring a name redaction. If you want to use your real name in the email and rely on screenshot mode to redact it, configure a redaction pair via `setScreenshotRedaction('Your Name', 'Tester')` in `configureMyScreenshotRedactions`.

---

### Example D — Zendesk P1 customer escalation *(optimized for Shot 3 — Calendar capture)*

This email is engineered to produce a dense Calendar event: an AI summary, four concrete due dates, and five numbered action items. It is the recommended source for Shot 3.

**From:** `noreply@zendesk.com`

**Subject:**
```
[Zendesk] P1 escalation: Pinnacle Financial down 4 hours, CTO requesting exec callback
```

**Body:**
```
CRITICAL ACCOUNT ESCALATION — IMMEDIATE ATTENTION REQUIRED

────────────────────────────────────────
TICKET DETAILS
────────────────────────────────────────
Ticket:           #ZD-2026-088741 (P1 — Critical)
Account:          Pinnacle Financial Group
ARR:              $312,000 (Enterprise Annual)
Customer since:   March 2023
Primary contact:  Marcus Webb, CTO <m.webb@pinnacle-financial.example>
Account owner:    Dana Sorenson <d.sorenson@acme-saas.example>
Opened:           May 4, 2026 at 8:14 AM CDT
SLA response due: May 4, 2026 at 10:14 AM CDT  ← BREACHED (2 hours overdue)
SLA resolve due:  May 4, 2026 at 4:14 PM CDT   ← 2 hours 11 minutes remaining

────────────────────────────────────────
INCIDENT SUMMARY
────────────────────────────────────────
Pinnacle Financial reports that their transaction-reconciliation dashboard
has been unavailable since 8:09 AM CDT. Approximately 40 finance staff are
blocked from end-of-month close activities. Month-end close is due to their
board by May 6, 2026 at 5:00 PM ET — a hard external deadline.

Marcus Webb (CTO) called the support line at 11:47 AM CDT and stated:
"If we cannot close the books by Wednesday we will be filing a contract
breach claim and issuing a formal termination notice."

────────────────────────────────────────
TIMELINE
────────────────────────────────────────
08:09 AM CDT  — Outage begins (undetected by internal monitoring)
08:14 AM CDT  — Ticket #ZD-2026-088741 opened by Dana Sorenson
10:14 AM CDT  — P1 SLA response window closes (no engineer assigned)
11:47 AM CDT  — CTO escalation call received
12:03 PM CDT  — This escalation notification generated

────────────────────────────────────────
KEY DATES AND DEADLINES
────────────────────────────────────────
SLA resolve deadline:       May 4, 2026 at 4:14 PM CDT
Executive callback window:  May 4, 2026 by 1:30 PM CDT (CTO available until 2:00 PM)
Incident post-mortem due:   May 5, 2026 at 12:00 PM CDT (customer-facing)
Month-end close deadline:   May 6, 2026 at 5:00 PM ET (customer's hard board deadline)
SLA credit claim window:    May 11, 2026 (7-day contractual filing window opens)

────────────────────────────────────────
RECOMMENDED ACTIONS
────────────────────────────────────────
1. Assign a senior engineer to Ticket #ZD-2026-088741 immediately and post
   an update within 15 minutes.
2. Call Marcus Webb at +1 (512) 555-0173 before 1:30 PM CDT today to
   acknowledge the breach and provide a recovery ETA.
3. Loop in your VP of Customer Success (or equivalent) before the callback.
4. Deliver a written incident post-mortem to m.webb@pinnacle-financial.example
   by May 5, 2026 at 12:00 PM CDT.
5. Review SLA credit eligibility under contract §8.3 and proactively offer
   the credit before the customer files — filing a claim on their own
   significantly increases churn probability.

View ticket: https://acme-saas.zendesk.com/agent/tickets/2026-088741

— Zendesk on behalf of Acme SaaS Support Operations
   Do not reply to this message.
```

**Why this works for Shot 3:** Five timestamps packed into "Key Dates and Deadlines" give Gemini maximum material to populate the Calendar event's Due Dates section. The numbered action list maps cleanly onto Calendar event description bullet points. The financial stakes and CTO-level urgency make the resulting Calendar event look immediately actionable — exactly the "visceral payoff" the shot needs to convey.
