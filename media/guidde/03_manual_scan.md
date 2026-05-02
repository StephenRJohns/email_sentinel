# Scan email now
**Duration:** 60 s
**Tool:** Guidde

Short, focused. Targets the user who just created a rule and is
impatient to see it work.

---

## Hook (0:00–0:05)
ON-SCREEN: Home card with the Scan email now button highlighted.
VOICEOVER:
Do not wait for the scheduled check. Run a scan right now and see
the result in seconds.

## Scene 1 — why it exists (0:05–0:18)
ON-SCREEN: Settings card showing the scan interval ("every 3
hours" on Free, "every 1 hour" on Pro). Highlight the "Scan email
now" hint paragraph.
VOICEOVER:
"e-mail Sentinel" polls Gmail in the background — every three hours
on the Free plan, every hour on Pro. That is a Google add-on
platform limit, not a tier choice. But Scan email now bypasses
the schedule entirely.

## Scene 2 — from the home card (0:18–0:30)
ON-SCREEN: Click Scan email now on the home card. The button shows
a spinner. After 10–15 seconds, the result card appears with a
green ✅ "Scan complete — 1 new email, 1 match."
VOICEOVER:
Click the button. You will see a spinner while it works — scans
usually take ten to thirty seconds — and then a result card
tells you what fired.

## Scene 3 — from the kebab menu (0:30–0:45)
ON-SCREEN: Open any other card (Settings, Activity Log). Click the
3-dot menu → Scan email now. Pre-scan card opens with explanation
and a Run scan now button. Click it; spinner; result.
VOICEOVER:
You can also kick off a scan from the 3-dot menu on any card.
A confirmation card appears with a Run scan now button — that is
the spinner you will watch while Gemini works.

## End card (0:45–0:50)
ON-SCREEN: Logo + Marketplace URL
VOICEOVER:
Instant scans, anytime. Get "e-mail Sentinel" — link below.

---

## Production notes

- The pre-scan card from the kebab menu is a recent addition. Make
  sure you are recording on a deployed version that has it.
- Sequence one real test email arriving just before recording so
  the scan returns "1 match" instead of "0 matches" — a green
  result card with content sells the feature better.

---

## Recording checklist (Guidde)

Before you start: Gmail open, demo account, Screenshot mode ON, one
SENTINEL_TEST email already sitting in INBOX, "e-mail Sentinel" side
panel open on the home card.

1. Hit **Start capture** in the Guidde extension.
2. Click the "e-mail Sentinel" side-panel icon (if not already open).
3. Click the **3-dot menu** (kebab) at the top of the card.
4. Click **Settings**.
5. Scroll to the *Scan email every* dropdown — hover it for ~1 second.
6. Click the **3-dot menu** again.
7. Click **Home**.
8. Click **Scan email now** on the home card.
9. Wait for the spinner → result card to appear (~10–30 s).
10. Click the **3-dot menu**.
11. Click **Activity Log**.
12. Click the **3-dot menu**.
13. Click **Scan email now** (this lands on the pre-scan card).
14. Click **Run scan now**.
15. Wait for the result card.
16. Hit **Stop capture** in Guidde.

After capture: in Guidde's editor, replace the auto-generated voiceover
on each step with the matching VOICEOVER lines from the scene script
above. Trim or merge any redundant click-steps Guidde captured (e.g.
double-clicks).
