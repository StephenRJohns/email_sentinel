# AI-assisted rule writing (Pro)
**Duration:** 90 s
**Tool:** Descript (more talking, fewer clicks; voiceover-heavy)

Show how Pro's AI rule-writing helper turns a vague intent
("alert me about angry customer emails") into a precise rule
text Gemini can match accurately.

---

## Hook (0:00–0:08)
ON-SCREEN: Rule editor with empty rule text → cut to the same
field filled with a polished rule.
VOICEOVER:
Describe what you want in a sentence. Gemini writes the rule.

## Scene 1 — Pro gate (0:08–0:18)
ON-SCREEN: Rule editor → "Help me write the rule text" button with the
Pro-only badge.
VOICEOVER:
AI rule writing is a Pro-plan feature. The Free plan still
writes rules — you just write the text yourself.

## Scene 2 — the prompt (0:18–0:45)
ON-SCREEN: Click "Help me write the rule text" → small input field opens
→ type "Alert me when a customer sounds angry or threatens to
cancel". Click Generate.
VOICEOVER:
Click 'Help me write the rule text'. Describe what you want in plain
English — the way you would ask a coworker. Be specific about
the behavior you want to catch, not just the topic.

## Scene 3 — review the suggestion (0:45–1:15)
ON-SCREEN: Generated text appears in the rule field: "Email
from a customer expressing frustration, anger, dissatisfaction,
or threatening to cancel, downgrade, leave a negative review,
or escalate to a manager. Includes both explicit ('I am
cancelling') and implicit ('this is unacceptable') signals."
VOICEOVER:
Gemini drafts a rule that captures explicit and implicit
signals — both 'I am cancelling' and 'this is unacceptable'
would match. Review it, edit anything you want, and save.
The same helper exists for the alert text format if you want
custom phrasing in your SMS or Chat messages.

## Scene 4 — refine (1:15–1:30)
ON-SCREEN: Edit the generated rule — narrow it slightly: change
"a customer" to "a customer of our paid plan". Save.
VOICEOVER:
AI suggestions are a starting point — your domain knowledge
is in the edit. Tighten the criteria so Gemini does not fire
on every passing complaint.

## End card (1:30–1:35)
ON-SCREEN: Logo + Marketplace URL
VOICEOVER:
Plain-English rules, written by Gemini. Pro plan. Get emAIl
Sentinel — link below.

---

## Production notes

- For Scene 3, the exact suggestion you get from Gemini varies
  per run. If you get an awkward one during recording, regenerate
  — the user does this anyway in real life.
- Avoid showing the actual Gemini key during this scene. Blur
  any visible Settings strip if you cut to it.

---

## Recording checklist (Guidde)

Marked Descript because of the heavier narration, but Guidde works
fine for capturing the click sequence — just overdub.

Before you start: Gmail open, demo account on Pro tier (run
`setTierPro` in the Apps Script editor), Screenshot mode ON, a
Gemini key already saved in Settings, side panel open on the home
card, at least one Gmail label ready to pick (e.g. `INBOX`).

1. Hit **Start capture** in the Guidde extension.
2. Click **Rules** on the home card.
3. Click **+ New rule**.
4. Click the **Name** field, type `Angry customer`.
5. Click the **Gmail label** dropdown, pick `INBOX`.
6. Hover the **Help me write the rule text** button for ~1 s (showing the
    Pro-only badge).
7. Click **Help me write the rule text**.
8. Click the suggestion-prompt field, type:
    `Alert me when a customer sounds angry or threatens to cancel`.
9. Click **Generate**.
10. Wait for the rule text to populate.
11. (If the suggestion is awkward, click **Generate** again; that is
    realistic.)
12. Click into the rule text field; edit `a customer` to
    `a customer of our paid plan`.
13. Click **Save**.
14. Hit **Stop capture** in Guidde.

After capture: blur any visible Gemini key. Replace the auto-
generated voiceover with the storyboard VOICEOVER lines.
