# SMS alerts setup
**Duration:** 180 s
**Tool:** Guidde

This is the longest setup flow because of the per-provider variance.
Use Textbelt as the demo provider — it has a free tier that does not
require a paid signup, so the video stays uninterrupted.

---

## Hook (0:00–0:08)
ON-SCREEN: Phone notification: "Tester — Critical security alert
matched. AWS GuardDuty blocked a sign-in attempt..."
VOICEOVER:
An SMS lands on your phone even when notifications are silenced.
Here is how to wire it up in three minutes.

## Scene 1 — pick a provider (0:08–0:35)
ON-SCREEN: Settings card → SMS provider dropdown showing Textbelt,
Telnyx, Plivo, Twilio, ClickSend, Vonage, and Generic webhook.
Hover each briefly. Pick Textbelt.
VOICEOVER:
"e-mail Sentinel" works with six SMS providers out of the box, plus
a generic webhook for anything else. Textbelt has a free tier with
one free SMS a day — perfect for testing. For volume, Telnyx and
Plivo are the cheapest of the named providers.

## Scene 2 — get the API key (0:35–1:00)
ON-SCREEN: Click the "Get a key" link → opens textbelt.com → grab
the demo or paid key → back to Settings → paste.
VOICEOVER:
Click Get a key, sign up at the provider, copy your API key, and
paste it into Settings. The key stays in your Google account —
"e-mail Sentinel" does not store it on any server we control.

## Scene 3 — add SMS recipients (1:00–1:35)
ON-SCREEN: Settings → SMS recipients section → "+ Add SMS
recipient" → form with name "On-call" and phone "+1 210 555 1212"
→ save. Show one or two more added.
VOICEOVER:
Add named recipients — names like 'On-call', 'CFO', 'Sales lead'.
Use full international format with the plus and country code.
Multiple recipients can receive the same alert, and rules pick
them by name.

## Scene 4 — test SMS (1:35–2:00)
ON-SCREEN: Click "Send test SMS" button → enter the recipient's
phone → click send → toast appears confirming. Cut to a phone
showing the test SMS arriving.
VOICEOVER:
Always run Send test SMS before you trust it for real alerts.
If the provider's account is not fully set up — for example,
Twilio without 10DLC registration — you will see the error here
instead of silently missing alerts in production.

## Scene 5 — attach SMS to a rule (2:00–2:30)
ON-SCREEN: Open Rules → edit a rule → check the SMS recipient
boxes for "On-call" and "Sales lead" → save.
VOICEOVER:
Open any rule, check the SMS recipients you want to notify, and
save. The same email can fan out to SMS, Calendar, and Chat at
once — pick the right channel for the right urgency.

## Scene 6 — pricing reality (2:30–2:55)
ON-SCREEN: A small text overlay: "Approximate cost per SMS:
Textbelt $0.05–0.10 · Telnyx $0.004 · Plivo $0.005 · Twilio $0.008
· ClickSend $0.05 · Vonage $0.0067"
VOICEOVER:
SMS costs are not part of your "e-mail Sentinel" subscription —
you are paying the provider directly. For most providers it is
under one cent per message. Set a budget alert with the provider
if you are worried about runaway alerts.

## End card (2:55–3:00)
ON-SCREEN: Logo + Marketplace URL
VOICEOVER:
Real SMS alerts in three minutes. Get "e-mail Sentinel" — link below.

---

## Production notes

- For Scene 4, you will need a real SMS to land on a real phone for
  the cutaway. Use the screenshot-mode demo number (+1 210 555 1212)
  is a fake; for the actual test cutaway you will need a real phone
  receiving — record that part separately and crop the phone frame
  tight so no real number is visible.
- Do not show your actual provider API key on screen. Type a fake
  one or blur the value after pasting.
- Pricing in Scene 6 is approximate and changes — pin a comment on
  YouTube linking to each provider's current pricing page rather
  than re-recording when prices drift.

---

## Recording checklist (Guidde)

Before you start: Gmail open, demo account, Screenshot mode ON, the
side panel open on the home card, a Textbelt API key copied to
clipboard (free tier `textbelt` works for one demo SMS), a real phone
ready to receive a test SMS (with screen recording cropped tightly so
no real number is visible), at least one rule already saved.

1. Hit **Start capture** in the Guidde extension.
2. Click **3-dot menu** → **Settings**.
3. Scroll to the **SMS provider** section.
4. Click the **SMS provider** dropdown.
5. Hover each option briefly (Textbelt, Telnyx, Plivo, Twilio,
   ClickSend, Vonage, Generic webhook).
6. Click **Textbelt**.
7. Click the **Get a key** link (opens textbelt.com in a new tab).
8. Switch back to Gmail.
9. Click the **API key** field, paste your Textbelt key.
10. Click **Save**.
11. Scroll to the **SMS recipients** section.
12. Click **+ Add SMS recipient**.
13. Click the **Name** field, type `On-call`.
14. Click the **Phone** field, type `+12105551212`.
15. Click **Save**.
16. (Back on Settings.) Click **+ Add SMS recipient** again, repeat
    with `Sales lead` / another demo number, save.
17. Click **Send test SMS**.
18. Click the recipient row for **On-call**.
19. Click **Send**.
20. Wait for the success toast.
21. (Cutaway shot — record separately.) Phone receives the SMS.
22. Back in the side panel, click **3-dot menu** → **Rules**.
23. Click an existing rule to open it.
24. Scroll to the SMS recipients section in the rule editor.
25. Check **On-call** and **Sales lead**.
26. Click **Save**.
27. Hit **Stop capture** in Guidde.

After capture: cut in the phone-receiving cutaway from step 21 over
Scene 4. Replace the auto-generated voiceover on each step with the
matching VOICEOVER lines from the scene script above. Add the pricing
text overlay (Scene 6) in the editor — it is not a captured screen.
