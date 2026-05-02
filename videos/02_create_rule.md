# Create a rule
**Duration:** ~2 min
**Tool:** Guidde (linear click-through fits perfectly)

Show how to create one rule from scratch — no starter template — so
viewers learn the field semantics, including a peek at both AI helpers
before canceling and finishing with the defaults.

---

## Hook (0:00–0:05)
ON-SCREEN: Rules card with "+ New rule" button highlighted.
VOICEOVER:
Rules are how e-mail Sentinel decides which emails get alerts.
Here is how to write one.

## Scene 1 — open the editor (0:05–0:15)
ON-SCREEN: Click "+ New rule"; the rule editor opens.
VOICEOVER:
Click New rule. The editor has six things to fill in — name,
the Gmail label to watch, the rule itself, the alert channels,
and the alert format.

## Scene 2 — name and label (0:15–0:30)
ON-SCREEN: Type rule name "Customer Escalation". Pick the Gmail
label — "support/escalations" — from the dropdown.
VOICEOVER:
Give it a short name you will recognize in alerts. Pick the Gmail
label to watch — e-mail Sentinel only checks emails inside that
label, so you control exactly what gets evaluated.

## Scene 3 — rule text (0:30–0:50)
ON-SCREEN: Type into the rule text field: "Email from a customer
that mentions cancellation, refund, downgrade, or escalation to a
manager."
VOICEOVER:
Write the rule in plain English. There is no syntax to learn —
Gemini reads each new email and decides whether it fits what
you described.

## Scene 4 — AI rule helper peek (0:50–1:10)
ON-SCREEN: Click "Help me write the rule text". A new card opens
showing a description input and a Generate button. Pause briefly,
then click Cancel to return to the rule editor.
VOICEOVER:
If you are not sure how to phrase the rule, the AI helper can
draft it for you — just describe what you want in plain English
and click Generate. We will stick with what we typed.

## Scene 5 — alert channels (1:10–1:30)
ON-SCREEN: Scroll down; check Calendar, Tasks, and SMS (if
configured). Show the SMS recipient checkboxes.
VOICEOVER:
Pick which channels get the alert. You can fan one rule out to
Calendar, Tasks, SMS, Google Chat — every channel you have set up
in Settings.

## Scene 6 — AI alert-text helper peek (1:30–1:50)
ON-SCREEN: Scroll to the alert format section. Click "Help me write
the alert text". A new card opens showing the selected channels and
a description input. Pause briefly, then click Cancel to return to
the rule editor.
VOICEOVER:
There is the same kind of helper for the alert message itself —
tell it what to include and Gemini writes the format instruction.
The default format works well, so we will leave it blank.

## Scene 7 — save and enable (1:50–2:00)
ON-SCREEN: Click Save. Back on Rules card, the new rule shows as
disabled. Toggle Enable.
VOICEOVER:
Save, then enable. The first time e-mail Sentinel sees the label
it baselines existing messages — no flood of old alerts. New
mail from now on goes through Gemini.

## End card (2:00–2:05)
ON-SCREEN: Logo + Marketplace URL
VOICEOVER:
Plain English. No regex. Get e-mail Sentinel — link below.

---

## Production notes

- Pre-create the "support/escalations" Gmail label before recording
  so it shows up in the dropdown.
- Record on **Pro tier** (`setTierPro` in the Apps Script editor)
  so the AI helpers open properly when clicked rather than showing
  an upgrade prompt.
- When you click "Help me write the rule text" in Scene 4, the card
  pre-populates its input with whatever you typed in the rule field —
  that is intentional and looks natural on camera.
- When you click "Help me write the alert text" in Scene 6, the card
  shows the channels you checked (Calendar, Tasks, SMS) — tick those
  first so the card context line is populated.

---

## Recording checklist (Guidde)

Before you start: Gmail open, demo account on **Pro tier** (run
`setTierPro` in the Apps Script editor), Screenshot mode ON, a
"support/escalations" Gmail label already created, the side panel
open on the home card, a Gemini key already saved in Settings, at
least one SMS recipient already added so the SMS checkbox section
is not empty.

1. Hit **Start capture** in the Guidde extension.
2. Click **Rules** on the home card.
3. Click **+ New rule**.
4. Click the **Name** field, type `Customer Escalation`.
5. Click the **Gmail label** dropdown, pick `support/escalations`.
6. Click the **Rule** text field, type:
   `Email from a customer that mentions cancellation, refund, downgrade, or escalation to a manager.`
7. Click **Help me write the rule text**.
8. (On the AI helper card.) Read the card briefly — do not type or click Generate.
9. Click **Cancel** to return to the rule editor.
10. Scroll down to the alert channels section.
11. Check **Calendar**.
12. Check **Tasks**.
13. Check the SMS recipient checkbox(es) you want to demo.
14. Scroll down to the **Alert format** section.
15. Click **Help me write the alert text**.
16. (On the AI helper card.) Read the card briefly — note it lists the channels you selected.
17. Click **Cancel** to return to the rule editor.
18. Click **Save**.
19. (Back on Rules card.) Click **On** on the new rule to enable it (the button flips to **Off** and the section header shows ✅ ON).
20. Hit **Stop capture** in Guidde.

After capture: in Guidde's editor, replace the auto-generated voiceover
on each step with the matching VOICEOVER lines from the scene script
above.
