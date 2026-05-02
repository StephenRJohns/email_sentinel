# Activity log & troubleshooting
**Duration:** 120 s
**Tool:** Descript (heavier on narration than clicks)

The "the alert did not fire" video. Pre-empt the support questions
that turn into 1-star reviews. Cover: how to read the log, common
reasons rules do not fire, and the Reset baseline lever.

---

## Hook (0:00–0:08)
ON-SCREEN: Activity log card with a few entries — some
"MATCH! ..." in green, one "No match" line, one "FAILED" line in
red.
VOICEOVER:
If a rule is not firing, the Activity log tells you why. It is
the first place to look.

## Scene 1 — open the log (0:08–0:25)
ON-SCREEN: 3-dots menu → Activity Log. Scroll through ~20
entries.
VOICEOVER:
Open Activity Log from the kebab menu. Every check writes
entries — when it ran, which labels it scanned, how many new
emails it found, what each rule decided about each email, and
any alert dispatch errors.

## Scene 2 — reading a match (0:25–0:50)
ON-SCREEN: Highlight a multi-line block: timestamp →
"Checking label INBOX (3 new)" → "From: ... | Subject: ..." →
"Evaluating against rule 'Critical security alerts' ..." →
"MATCH! Email mentions a security incident from a known service"
→ "Calendar event created."
VOICEOVER:
Each new email shows you the From and Subject, then a line
per rule it was evaluated against. A green MATCH means Gemini
said yes — it shows the reason — and the lines after tell you
which channels fired.

## Scene 3 — reading a no-match (0:50–1:10)
ON-SCREEN: Highlight a block ending with "No match. The email is
about a marketing newsletter, not a security incident."
VOICEOVER:
A No match line tells you why Gemini decided the email
does not fit the rule. If you see No match for emails you
*think* should match, the rule text needs sharpening — read
the reason and adjust.

## Scene 4 — failures and the retry (1:10–1:30)
ON-SCREEN: Highlight a red line — "MCP 'Asana' HTTP 401:
Unauthorized" — followed by "Evaluation failed — will retry next
run."
VOICEOVER:
Red lines are failures. Alert dispatch errors include the
exact response from the channel. Evaluation failures —
Gemini quota, transient network — automatically retry on the
next run, so you do not lose alerts to a temporary glitch.

## Scene 5 — Reset baseline (1:30–1:55)
ON-SCREEN: Settings card → Reset baseline button → confirmation.
VOICEOVER:
If you have changed rules and want to re-evaluate emails the
add-on already saw, hit Reset baseline in Settings. Be
careful — the next run will treat every recent message as
brand new and may fire a flurry of alerts. Use it for testing
rule changes, not in production.

## End card (1:55–2:00)
ON-SCREEN: Logo + Marketplace URL
VOICEOVER:
Full audit trail, no black box. Get "e-mail Sentinel" — link below.

---

## Production notes

- Salt the Activity log with three different scenarios before
  recording: a match, a no-match, and a failure. The simplest
  way is (1) trigger a successful match, (2) write a rule that
  should not match an existing email and run a scan, (3)
  temporarily set an MCP server endpoint to a 401-returning URL
  for a fake failure.
- For Scene 5, demonstrate but Do not actually hit Reset
  baseline on a live deployment — record the click-and-confirm
  on a fresh demo account, then Cancel.
- The activity log in screenshot mode shows the demo From line
  ("Tester <test@example.com>") instead of real senders —
  do not forget to enable screenshot mode before recording.

---

## Recording checklist (Guidde)

Marked Descript for narration depth, but you can capture the click
flow with Guidde and overdub.

Before you start: Gmail open, demo account, Screenshot mode ON, the
Activity log **pre-salted** with all three scenarios — at least one
green MATCH, one No-match, and one red MCP failure (see Production
notes above for how to salt it). A fresh second demo account is
helpful for Scene 5 so you can demo Reset baseline without harming
real state.

1. Hit **Start capture** in the Guidde extension.
2. Click the **3-dot menu** on the home card.
3. Click **Activity Log**.
4. Scroll slowly down through ~20 entries.
5. Hover a multi-line MATCH block (timestamp → "Checking label
    INBOX (3 new)" → "From: ... | Subject: ..." → "Evaluating against
    rule '...'" → green "MATCH! ..." → "Calendar event created.")
    for ~3 s.
6. Scroll to a No-match block; hover the "No match. The email is
    about ..." line for ~3 s.
7. Scroll to a red MCP failure block; hover the
    `MCP "Asana" HTTP 401: Unauthorized` line, then the
    "Evaluation failed — will retry next run." line for ~3 s.
8. Click the **3-dot menu** → **Settings**.
9. Scroll to the **Reset baseline** button.
10. Click **Reset baseline**.
11. On the confirmation dialog, click **Cancel** (do **not** confirm
    on a live deployment).
12. Hit **Stop capture** in Guidde.

After capture: replace the auto-generated voiceover with the
storyboard VOICEOVER lines. The hover/dwell shots in steps 5–7 are
where most of the narration lives — make sure each pause is long
enough to read the highlighted lines.
