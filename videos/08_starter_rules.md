# Starter rules
**Duration:** 60 s
**Tool:** Guidde

Tightest possible. Show that you can be alert-ready in 30 seconds
without writing any rule text yourself.

---

## Hook (0:00–0:05)
ON-SCREEN: Rules card → "Starter rules" button.
VOICEOVER:
Skip writing your first rule. Pick from the templates and edit
later.

## Scene 1 — open the picker (0:05–0:18)
ON-SCREEN: Click Starter rules. The card shows the five available
templates — Urgent emails, Invoices and payment requests, Shipping
and delivery updates, Security and account alerts, Bills and
subscription renewals.
VOICEOVER:
Click Starter rules. Five templates are available out of the box,
each watching INBOX with a battle-tested rule text. They are
created in a disabled state so you can pick channels and enable
the ones you want.

## Scene 2 — create the set (0:18–0:35)
ON-SCREEN: Click "Create starter rules". The toast confirms how
many were created. On Pro: "5 starter rules created (disabled)…".
On Free: "3 starter rules created (disabled)… 2 skipped (Free plan
limit reached — upgrade to Pro for unlimited rules)."
VOICEOVER:
Click Create starter rules. On the Pro plan, all five are created
at once. On the Free plan, the three-rule limit applies — the
first three are created and the rest are skipped with a one-tap
upgrade hint. Either way, every rule is created disabled so you
can configure channels before they start firing.

## Scene 3 — enable one (0:35–0:50)
ON-SCREEN: Open the "Urgent emails" rule, add an SMS recipient,
confirm the watched label is INBOX (or switch it), toggle Enable,
click Save.
VOICEOVER:
For each starter rule you want to use, confirm the Gmail label,
pick your alert channels, and click On. The starter rule
text is a starting point — refine it once you see real alerts.

## End card (0:50–0:55)
ON-SCREEN: Logo + Marketplace URL
VOICEOVER:
Be alert-ready in thirty seconds. Get e-mail Sentinel — link below.

---

## Production notes

- The exact starter rule list is in `STARTER_RULES_` in
  `Cards.gs`. Re-record only when that list changes
  meaningfully.
- Aim for under 60s total — this is the second-shortest video
  and it should feel snappy.

---

## Recording checklist (Guidde)

Before you start: Gmail open, demo account on **Pro tier** (run
`setTierPro` in the Apps Script editor — the script demos all five
rules being created in one click; the Free-tier behavior is mentioned
in voiceover, not shown), Screenshot mode ON, the demo account has
**no rules yet** (delete any existing rules first so the Rules card
lands cleanly on the empty state), at least one SMS recipient already
saved in Settings, side panel open on the home card.

1. Hit **Start capture** in the Guidde extension.
2. Click **Rules** on the home card.
3. Click **Starter rules**.
4. (Hover the list of templates for ~2 s — Urgent emails, Invoices
    and payment requests, Shipping and delivery updates, Security and
    account alerts, Bills and subscription renewals.)
5. Click **Create starter rules**.
6. Wait for the confirmation toast; the five rules appear in the
    Rules list, all disabled.
7. Click the **Urgent emails** rule (or any rule the demo account
    has at least one matching SMS recipient for).
8. Scroll to the SMS recipients section.
9. Check at least one SMS recipient.
10. Confirm the Gmail label is **INBOX** (or change it).
11. Toggle **Enable**.
12. Click **Save**.
13. Hit **Stop capture** in Guidde.

After capture: replace the auto-generated voiceover with the
storyboard VOICEOVER lines. Trim aggressively — this video should
feel snappy at under 60 s. The Free-tier "3 of 5" call-out in
Scene 2 is voiceover-only; do not re-shoot on a Free-tier account
to capture the limit toast (the visual is just a different number
in the same toast, not worth a second take).
