# Quickstart — install to first alert
**Duration:** 180 s
**Tool:** Descript (narrative; some screen recording, some talking)

This is the anchor video. Pin it on the YouTube channel and link it from
the Marketplace listing description. Goal: a viewer who is never heard of
"e-mail Sentinel" understands what it does, decides to install, and gets
their first alert — all in three minutes.

---

## Hook (0:00–0:08)
ON-SCREEN: Phone notification sliding in: "AWS — Unusual sign-in attempt
blocked" — then cut to a Gmail inbox with the sidebar open.
VOICEOVER:
Important emails get buried. "e-mail Sentinel" reads your Gmail with AI.
It texts you the ones you cannot afford to miss.

## Scene 1 — install (0:08–0:30)
ON-SCREEN: Google Workspace Marketplace listing → click Install → consent
screen → finish.
VOICEOVER:
Install from the Google Workspace Marketplace. "e-mail Sentinel" runs
entirely inside your own Google account. Your email never leaves
Google's servers.

## Scene 2 — open in Gmail (0:30–0:50)
ON-SCREEN: Gmail loads, the "e-mail Sentinel" sidebar icon appears on the
right rail. Click it; the home card opens.
VOICEOVER:
Open Gmail. Click the sidebar icon. The home card has rules,
settings, and a Scan email now button for instant checks.

## Scene 3 — Gemini key (0:50–1:15)
ON-SCREEN: Click Settings → paste a Gemini API key → Save.
VOICEOVER:
Paste a free Gemini API key from Google AI Studio. The free tier
covers about fifteen hundred email checks per day. That is more
than enough for personal use. The key stays in your account.
We never see it.

## Scene 4 — first rule via starter (1:15–1:45)
ON-SCREEN: Rules card → "Starter rules" → pick "Critical security
alerts" → create. Open the rule, add Calendar as the alert channel,
enable.
VOICEOVER:
For your first rule, pick a starter template. We will use Critical
security alerts. It watches your inbox for AWS, Cloudflare, and
Google security notifications. Add Calendar as the alert channel.
Then enable it.

## Scene 5 — trigger an alert (1:45–2:25)
ON-SCREEN: Send a SENTINEL_TEST email to yourself (use the AWS sample
from `work/marketing/screenshot_plan.md`). Back in Gmail, click the
3-dot menu → Scan email now → Run scan now. Wait for the green
"Scan complete — 1 match" card.
VOICEOVER:
Send yourself a test alert. Click Scan email now. Gemini reads the
message. It decides if the message matches your rule. Then it writes
a summary. A Calendar event lands on your calendar with the time,
the source, and the action items.

## Scene 6 — see the alert (2:25–2:55)
ON-SCREEN: Switch to Google Calendar — show the event Gemini just
created with the AI-generated description.
VOICEOVER:
There is the event. The title shows what matched. The description
has the sender, the subject, and a Gemini-written summary. Action
items and due dates are pulled directly from the email body.

## End card (2:55–3:00)
ON-SCREEN: Logo + "e-mail Sentinel — Google Workspace Marketplace"
VOICEOVER:
Free plan. No credit card. Install in two minutes. Link below.

---

## Production notes

- The hook (0:00–0:08) is the most important 8 seconds of the video.
  If you do not have a phone-notification asset, replace the opening
  shot with a side-by-side: a real-time-stamped email in the inbox
  on the left, and the SMS/Calendar alert that fired from it on the
  right.
- For Scene 3, blur the Gemini key visually after pasting — viewers
  should not see real key strings.
- Keep a single voice throughout. If using ElevenLabs, lock the
  voice ID and re-use across all 10 videos for brand consistency.

---

## Recording checklist (Guidde)

This script is marked Descript because of the heavy narration, but if
you want a Guidde first pass, capture the install + alert flow with
this checklist and overdub later.

Before you start: a *fresh* demo Gmail account with the add-on
**uninstalled**, the Marketplace listing URL ready in another tab, a
free Gemini API key copied to your clipboard, the AWS sample email
body from `work/marketing/screenshot_plan.md` ready to paste into a
compose window, Screenshot mode ON in the Apps Script editor, Google
Calendar open in another tab.

1. Hit **Start capture** in the Guidde extension.
2. Switch to the Marketplace listing tab.
3. Click **Install**.
4. Click through the OAuth consent screen → **Allow**.
5. Click **Done** when install completes.
6. Switch to Gmail, refresh the tab.
7. Click the **"e-mail Sentinel" sidebar icon** on the right rail.
8. (Pause on the home card for ~2 s.)
9. Click the **3-dot menu** → **Settings**.
10. Click the **Gemini API key** field, paste your key.
11. Click **Save**.
12. Click the **3-dot menu** → **Home**.
13. Click **Rules** on the home card.
14. Click **Starter rules**.
15. Click **Create starter rules**.
16. In the Rules list, click the **Critical security alerts** rule.
17. Check the **Calendar** alert channel.
18. Click **Save**.
19. (Back on the Rules card.) Click the **On** toggle on the Critical security alerts rule.
20. Open a new Gmail compose window. To: yourself. Subject: paste the
    AWS sample subject line. Body: paste the AWS sample body. Send.
21. Wait ~5 s for the email to arrive in INBOX.
22. Back in the side panel, click the **3-dot menu** → **Scan email now**.
23. Click **Run scan now**.
24. Wait for the green ✅ result card.
25. Switch to the **Google Calendar** tab.
26. Click the newly-created event so the description panel opens.
27. Hit **Stop capture** in Guidde.

After capture: drop the storyboard voiceover into Descript over your
captured screen recording, or import into Guidde and replace its
auto-generated narration step-by-step from the script.
