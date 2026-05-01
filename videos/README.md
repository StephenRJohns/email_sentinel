# e-mail Sentinel — help-video scripts

Ten short scripts (60–180 s each) covering every user-facing flow. Designed
to be recorded with one of:

- **[Guidde](https://www.guidde.com/)** — record the workflow once in the
  browser, the tool generates a video with AI voiceover synthesized from your
  click sequence. Best for the linear how-to scripts (02, 03, 04, 05, 07, 08).
- **[Descript](https://www.descript.com/)** — record screen + your own voice
  (or AI voice via ElevenLabs), edit like a Google Doc. Best for narrative-
  heavy scripts (01 quickstart, 09 AI suggest, 10 troubleshooting).

Total runtime when stitched: ~22 minutes. Recording + editing budget:
~½ day per video for a polished result, or 30 minutes per video with
Guidde for first-pass quality.

---

## Script convention

Every script uses this structure so the tool import is consistent:

```
# Title
**Duration:** {target} s
**Tool:** Guidde | Descript

## Hook (0:00–0:05)
ON-SCREEN: {opening shot}
VOICEOVER: "{hook line}"

## Scene {N} (M:SS–M:SS)
ON-SCREEN: {action}
VOICEOVER: "{narration}"

...

## End card (last 5 s)
ON-SCREEN: e-mail Sentinel logo + Marketplace URL
VOICEOVER: "{CTA}"
```

Voiceover lines should be conversational, not corporate. If a sentence
does not read naturally out loud, rewrite it. The total VO word count
should map roughly to **~150 words / minute** — anything denser sounds
rushed.

---

## Recording prep checklist

Before you start recording any of these:

1. **Use a demo Gmail account** — not your real one. Recipient names in
   Gmail's chrome are visible to viewers.
2. **Enable screenshot mode** in the Apps Script editor:
   `setScreenshotModeOn` from the function dropdown. This substitutes
   `Tester <test@example.com>` for the From header, `+12105551212` for
   SMS recipients, and applies your private body redactions.
3. **Configure your local PII redactions** via
   `configureMyScreenshotRedactions` (edit locally, run, revert before
   commit) — see `ScreenshotMode.gs`.
4. **Have the SENTINEL_TEST sample emails ready** — see
   `work/marketing/screenshot_plan.md` for the AWS / Stripe / DocuSign
   bodies that produce rich, screenshot-worthy alerts.
5. **Set Chrome to 1280 × 800** via DevTools → Ctrl+Shift+M → Responsive
   1280 × 800 (only if recording for a 720p / 1080p YouTube target).
6. **Pre-create the watched Gmail label** (e.g. "Sentinel-Demo") and have
   one or two SENTINEL_TEST emails sitting in it before you start, so the
   Scan-now demo lands a real-looking match.

---

## Script index

| # | Script | Duration | Best tool |
|---|---|---|---|
| 01 | [Quickstart — install to first alert](01_quickstart.md) | 180 s | Descript |
| 02 | [Create a rule](02_create_rule.md) | 90 s | Guidde |
| 03 | [Scan email now](03_manual_scan.md) | 60 s | Guidde |
| 04 | [SMS alerts setup](04_sms_setup.md) | 180 s | Guidde |
| 05 | [Google Chat alerts setup](05_chat_setup.md) | 90 s | Guidde |
| 06 | [Calendar / Sheets / Tasks alerts](06_calendar_sheets_tasks.md) | 120 s | Descript |
| 07 | [MCP server alerts (Pro)](07_mcp_setup.md) | 180 s | Guidde |
| 08 | [Starter rules](08_starter_rules.md) | 60 s | Guidde |
| 09 | [AI-assisted rule writing (Pro)](09_ai_suggest.md) | 90 s | Descript |
| 10 | [Activity log & troubleshooting](10_activity_log.md) | 120 s | Descript |
