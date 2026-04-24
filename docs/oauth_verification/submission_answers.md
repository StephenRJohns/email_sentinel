# OAuth Verification Answers — emAIl Sentinel™

This file contains the written justifications for the OAuth verification
submission in Google Cloud Console. Paste each section into the matching
field when you submit.

Scopes here must match `appsscript.json` exactly. Any mismatch = automatic
rejection.

---

## App Overview (Reviewer Summary)

emAIl Sentinel™ is a Gmail add-on that runs entirely within the user's
Google account (Google Apps Script). It monitors Gmail labels selected by
the user, evaluates each new message against user-defined plain-English
rules using the Google Gemini API, and — when a rule matches — delivers
alerts through channels the user explicitly enables: Google Calendar,
Google Sheets, Google Tasks, Google Chat webhooks, SMS via the user's
choice of provider (six built-in presets plus a generic webhook for any
other provider), or custom Model Context Protocol (MCP) endpoints.

The add-on has no external backend database. Data is accessed and
processed only to provide user-facing functionality requested by the user.

---

## Scopes Requested & Justifications

### 1) https://www.googleapis.com/auth/gmail.addons.execute

**Purpose:** Required to run as a Gmail add-on.
**Why necessary:** Granted implicitly by installing any Gmail add-on. The
add-on cannot render cards in the Gmail sidebar without this scope.

---

### 2) https://www.googleapis.com/auth/gmail.readonly

**Purpose:** Read message metadata (sender, subject, received date,
attachment filenames) and up to the first 2,000 characters of the
plain-text body, only from Gmail labels the user explicitly configures,
for rule evaluation by the Gemini API.
**Why necessary:** The core product feature is semantic rule evaluation
against the user's own mail. Read-only is sufficient — no messages are
modified, sent, deleted, archived, labeled, or moved.
**Data use:** Used solely to evaluate user-defined rules and format alert
messages the user configures. Not used for advertising, resale, or
training generalized models.

---

### 3) https://www.googleapis.com/auth/calendar

**Purpose:** Create Calendar events as alerts when the user enables the
Google Calendar alert channel on a rule.
**Why necessary:** CalendarApp requires the full calendar scope; the
narrower calendar.events scope is only compatible with the advanced
Calendar service, which is not used here.
**Control:** Only writes to calendars selected by the user. Only used
when the user enables "Create calendar event" on a specific rule.

---

### 4) https://www.googleapis.com/auth/spreadsheets

**Purpose:** Append rows to a Google Sheets spreadsheet as alerts when
the user enables the Google Sheets alert channel on a rule.
**Control:** Only writes to the spreadsheet the user has selected (or a
spreadsheet auto-created in their own Drive if they leave the ID blank).

---

### 5) https://www.googleapis.com/auth/tasks

**Purpose:** Create Google Tasks as alerts when the user enables the
Google Tasks alert channel on a rule.
**Control:** Only writes to the Task List the user has selected.

---

### 6) https://www.googleapis.com/auth/script.external_request

**Purpose:** Make outbound HTTPS calls to user-enabled integrations:
  • Google Gemini API (generativelanguage.googleapis.com) — for rule
    evaluation and alert formatting.
  • The SMS provider the user configures — any provider the user chooses,
    whether it's one of six built-in presets (Textbelt, Telnyx, Plivo,
    Twilio, ClickSend, Vonage) or any HTTPS endpoint the user configures
    as a generic webhook.
  • Google Chat webhook URLs the user configures.
  • MCP server endpoints the user configures (Slack, Microsoft 365 /
    Teams, Asana, or custom endpoints via Model Context Protocol).
**Control:** Only called when the user enables and configures the
corresponding integration.

---

### 7) https://www.googleapis.com/auth/script.scriptapp

**Purpose:** Create and manage time-driven triggers that schedule
background email checks at the user-configured polling interval.
**Why necessary:** Enables background execution after the user clicks
"Start monitoring"; without this scope the add-on cannot check mail
except when the user is actively viewing the card.

---

## Limited Use Compliance Statement

The use of information received from Google APIs adheres to the Google
API Services User Data Policy, including the Limited Use requirements.
Data is used only to provide user-facing functionality requested by the
user, is not used for advertising, and is not sold or transferred except
as necessary to provide the Service the user has enabled.

---

## Data Storage & Security

- No external backend database.
- All data is processed within the user's own Google Apps Script
  execution context.
- Configuration and settings are stored in Apps Script UserProperties,
  which is per-user, per-script, and private to the user's Google
  account.
- All outbound network calls use HTTPS.
- The Gemini API key is masked in the UI after save (only last 4
  characters shown).

---

## User Control

- Users explicitly select which Gmail labels are monitored.
- Users explicitly enable / disable every integration on every rule.
- Users can stop monitoring at any time from the add-on's home card.
- Users can delete all stored configuration data at any time by
  uninstalling the add-on, or by running
  `PropertiesService.getUserProperties().deleteAllProperties()` in the
  Apps Script editor.

---

## Contact

legal@jjjjjenterprises.com
