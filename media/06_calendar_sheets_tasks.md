# Calendar / Sheets / Tasks alerts
**Duration:** 120 s
**Tool:** Descript (cuts between three Google apps; narrative pacing)

The three Google-native channels share the same setup story —
nothing to configure, just pick them in any rule. Bundle into one
video so viewers see the full Google-suite story at once.

---

## Hook (0:00–0:08)
ON-SCREEN: Quick montage — a Calendar event lands, a Sheets row
appears, a Task pops up — all from the same email.
VOICEOVER:
Three free alert channels you already use. No setup, no API
keys — just check a box.

## Scene 1 — Google Calendar (0:08–0:40)
ON-SCREEN: Rule editor → check Calendar → save. Send a SENTINEL_TEST
email. Run Scan email now. Cut to Google Calendar — the event has
a clear title, the rule name in brackets, the email subject, and
a description with sender, received time, and the AI-generated
summary.
VOICEOVER:
Calendar alerts land on your default calendar with the rule
name and the email subject in the title. The description has
the sender, the timestamp, and a Gemini-generated summary of
what the email actually means. Default duration is fifteen
minutes — they show up in your day so you do not miss them.

## Scene 2 — Google Sheets (0:40–1:15)
ON-SCREEN: Rule editor → check Sheets → save. After a match,
open the auto-created "e-mail Sentinel — Alert Log" sheet. Show
the columns: Timestamp, Rule, From, Subject, Received, Alert
Message.
VOICEOVER:
Sheets builds you an audit log automatically. The first time
a Sheets alert fires, "e-mail Sentinel" creates a spreadsheet in
your Drive called '"e-mail Sentinel" — Alert Log' and appends a
row for every match. Pivot it, filter it, share it with your
team — it is just Google Sheets.

## Scene 3 — Google Tasks (1:15–1:45)
ON-SCREEN: Rule editor → check Tasks → save. After a match,
open Google Tasks (or the side panel in Gmail). Show the new
task: title with rule name + subject, notes with sender +
timestamp + Gemini summary.
VOICEOVER:
Tasks is for actionable alerts. Each match creates a task
in your default list with the same details — sender, time,
subject, summary. Check it off when you have acted on it. If
you use Gemini-suggested due dates in the alert summary,
they are right there in the task notes.

## Scene 4 — combine them (1:45–2:00)
ON-SCREEN: Rule editor → check all three: Calendar, Sheets,
Tasks. Save. Show the result of one match landing on all three.
VOICEOVER:
Mix and match per rule. Customer escalations to Tasks for
action plus Sheets for the log. Security alerts to Calendar
so they show up in your day. There is no extra cost — these
are all Free plan.

## End card (2:00–2:05)
ON-SCREEN: Logo + Marketplace URL
VOICEOVER:
Three free channels in your Google account. Get emAIl
Sentinel — link below.

---

## Production notes

- Pre-create one SENTINEL_TEST email so a single Scan-now
  produces visible Calendar, Sheets, and Tasks artifacts you
  can cut between.
- The auto-created Sheets file's name is literal — shoot the
  filename in the Drive title bar to reinforce the
  "automatic" claim.
- For the Tasks demo, the Gmail side panel is faster to record
  than opening tasks.google.com.

---

## Recording checklist (Guidde)

Marked Descript because of the cuts between three Google apps, but
you can capture each segment with Guidde and stitch in Descript.

Before you start: Gmail open, demo account, Screenshot mode ON, one
SENTINEL_TEST email already in INBOX, an existing rule called e.g.
`Demo rule` watching INBOX, side panel open. Tabs open in this order:
Gmail, Google Calendar, Google Drive (logged in), Google Tasks (or
the side panel will do).

1. Hit **Start capture** in the Guidde extension.
2. Click **Rules** on the home card.
3. Click the `Demo rule`.
4. Check **Calendar**.
5. Check **Sheets**.
6. Check **Tasks**.
7. Click **Save**.
8. (Back on Rules card.) Click **3-dot menu** → **Scan email now**.
9. Click **Run scan now**.
10. Wait for the green ✅ result card.
11. Switch to the **Google Calendar** tab.
12. Refresh; click the newly-created event so the description panel
    opens.
13. Switch to the **Google Drive** tab.
14. Click the file `"e-mail Sentinel" — Alert Log` (newly created).
15. Hover the columns: Timestamp, Rule, From, Subject, Received,
    Alert Message.
16. Switch back to **Gmail**.
17. Click the Google Tasks side-panel icon (right rail).
18. Click the newly-created task to expand it.
19. Hit **Stop capture** in Guidde.

After capture: cut between the three destination tabs in the editor
to match Scenes 1–3. The Scene 4 ("combine them") shot is the same
material — just open the rule again and visibly check all three boxes
in one frame. Replace the auto-generated voiceover with the storyboard
VOICEOVER lines.
