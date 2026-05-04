# Calendar / Sheets / Tasks / Docs alerts
**Duration:** 150 s
**Tool:** Descript (cuts between four Google apps; narrative pacing)

The four Google-native channels share the same setup story —
nothing to configure, just pick them in any rule. Bundle into one
video so viewers see the full Google-suite story at once.

---

## Hook (0:00–0:08)
ON-SCREEN: Quick montage — a Calendar event lands, a Sheets row
appears, a Task pops up, a Docs entry appears — all from the same email.
VOICEOVER:
Four free alert channels you already use. No setup. No API keys.
Just check a box.

## Scene 1 — Google Calendar (0:08–0:40)
ON-SCREEN: Rule editor → check Calendar → save. Send a SENTINEL_TEST
email. Run Scan email now. Cut to Google Calendar — the event has
a clear title, the rule name in brackets, the email subject, and
a description with sender, received time, and the AI-generated
summary.
VOICEOVER:
Calendar alerts land on your default calendar. The title shows the
rule name and the email subject. The description has the sender,
the timestamp, and a Gemini-generated summary. Default duration is
fifteen minutes. They show up in your day so you do not miss them.

## Scene 2 — Google Sheets (0:40–1:10)
ON-SCREEN: Rule editor → check Sheets → save. After a match,
open the auto-created "e-mail Sentinel" — Alert Log sheet. Show
the columns: Timestamp, Rule, From, Subject, Received, Alert
Message.
VOICEOVER:
Sheets builds you an audit log automatically. The first time a
Sheets alert fires, "e-mail Sentinel" creates a spreadsheet in your
Drive. The spreadsheet is called "e-mail Sentinel" — Alert Log.
Every match appends a row. Pivot it. Filter it. Share it with your
team. It is just Google Sheets.

## Scene 3 — Google Tasks (1:10–1:35)
ON-SCREEN: Rule editor → check Tasks → save. After a match,
open Google Tasks (or the side panel in Gmail). Show the new
task: title with rule name + subject, notes with sender +
timestamp + Gemini summary.
VOICEOVER:
Tasks is for actionable alerts. Each match creates a task in your
default list. The task includes the sender, time, subject, and
summary. Check it off when you have acted on it. If you use
Gemini-suggested due dates in the alert summary, they appear right
there in the task notes.

## Scene 4 — Google Docs (1:35–2:00)
ON-SCREEN: Rule editor → check Docs → save. After a match,
open the auto-created "e-mail Sentinel" — Alert Log document in
Drive. Show the appended entry: a heading with the timestamp and
rule name, then From, Subject, Received, and the AI-generated
alert text.
VOICEOVER:
Docs is for a running narrative log. Each match appends a
structured entry to a document in your Drive. The document is
created automatically the first time a Docs alert fires. It is
called "e-mail Sentinel" — Alert Log. Use it as a reading log,
a feedback journal, or an audit trail you can share with a
colleague.

## Scene 5 — combine them (2:00–2:20)
ON-SCREEN: Rule editor → check all four: Calendar, Sheets,
Tasks, Docs. Save. Show the result of one match landing on all four.
VOICEOVER:
Mix and match per rule. Customer escalations go to Tasks for action
and to Sheets for the log. Security alerts go to Calendar so they
show up in your day. Newsletters and feedback go to Docs for a
narrative archive. There is no extra cost. These are all Free plan.

## End card (2:20–2:25)
ON-SCREEN: Logo + Marketplace URL
VOICEOVER:
Four free channels in your Google account. Get "e-mail Sentinel".
Link below.

---

## Production notes

- Pre-create one SENTINEL_TEST email so a single Scan-now
  produces visible Calendar, Sheets, Tasks, and Docs artifacts you
  can cut between.
- The auto-created Sheets and Docs files share the same name —
  shoot the filename in the Drive title bar to reinforce the
  "automatic" claim.
- For the Tasks demo, the Gmail side panel is faster to record
  than opening tasks.google.com.
- For the Docs demo, scroll to the bottom of the document to show
  the most recent appended entry.

---

## Recording checklist (Guidde)

Marked Descript because of the cuts between four Google apps, but
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
7. Check **Docs**.
8. Click **Save**.
9. (Back on Rules card.) Click **3-dot menu** → **Scan email now**.
10. Click **Run scan now**.
11. Wait for the green ✅ result card.
12. Switch to the **Google Calendar** tab.
13. Refresh; click the newly-created event so the description panel
    opens.
14. Switch to the **Google Drive** tab.
15. Click the file `emAIl Sentinel — Alert Log` spreadsheet (newly
    created).
16. Hover the columns: Timestamp, Rule, From, Subject, Received,
    Alert Message.
17. Switch back to **Gmail**.
18. Click the Google Tasks side-panel icon (right rail).
19. Click the newly-created task to expand it.
20. Switch to the **Google Drive** tab again.
21. Click the `emAIl Sentinel — Alert Log` document (newly created).
22. Scroll to the bottom — the appended entry shows the timestamp
    heading, sender, subject, and Gemini summary.
23. Hit **Stop capture** in Guidde.

After capture: cut between the four destination tabs in the editor
to match Scenes 1–4. The Scene 5 ("combine them") shot is the same
material — just open the rule again and visibly check all four boxes
in one frame. Replace the auto-generated voiceover with the storyboard
VOICEOVER lines.
