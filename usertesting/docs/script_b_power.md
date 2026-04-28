# UserTesting — Script B: Power user / SMS path

**Target session length:** 20 minutes (unmoderated, screen + audio recording)
**Cohort within Round 1:** 4 of 10 sessions
**Pre-supplied to tester:**
- Test-deployment install URL (issued by developer)
- Gemini API key (rotate after the round)
- Textbelt API token (use the literal string `textbelt` — Textbelt's free tier allows 1 SMS/day per IP/account at no cost; avoids A2P 10DLC registration)

---

## What this product is (one-line summary for tester intro)

emAIl Sentinel is a Gmail add-on that watches your inbox and sends you alerts (SMS, Calendar event, etc.) when emails matching plain-English rules arrive. In this session you'll set it up to **text your phone** when a specific kind of email arrives.

---

## Screener questions (submit with the test on UserTesting)

Tester must answer **yes** to all five to qualify:

1. Do you use Gmail daily as your primary email account?
2. Do you receive 50+ emails per day in Gmail (work + personal combined)?
3. Are you in one of these roles: small business owner, freelancer/consultant, salesperson, real estate agent, paralegal, recruiter, or another role where missing an important email has real consequences?
4. Are you in the United States?
5. Do you have a US mobile phone number you're willing to receive **one** test SMS message at during the session? (We will not store, share, or use your number after the session.)

Tester must answer **yes** to one of:

6a. Have you ever installed a Gmail add-on, browser extension, or Workspace add-on before?
6b. Are you comfortable installing software in your browser when given a link?

---

## Tester briefing (read by tester at session start)

You're going to test a Gmail add-on called emAIl Sentinel that's in private pre-launch testing. You'll install it, set up an SMS provider so it can text you, create a rule, send yourself a test email, and confirm a real text message arrives on your phone.

**Important — you'll see a warning page during install** that says *"This app hasn't been verified by Google yet."* That's expected — this is a private pre-launch test. Click **Continue** and **Allow** when you see those screens.

**About the SMS:** the test will send **one** SMS to your phone via a free testing service (Textbelt). The text will say something like *"[emAIl Sentinel] Test rule: DEMO test 1"*. We do not see, store, or use your number after the session.

Please **think aloud the entire time** — narrate what you're looking at, what you expect, what's confusing.

---

## Pre-supplied credentials

- **Gemini API key:** `<DEV_GEMINI_KEY>` — paste into Settings → Gemini API key.
- **Textbelt API key:** the literal string `textbelt` (Textbelt's free-tier shared token; works for 1 SMS/day).
- **Test-deployment install URL:** `<TEST_DEPLOYMENT_URL>`.

---

## Tasks

### Task 1 — Install the add-on (3 min)

1. Open `<TEST_DEPLOYMENT_URL>`. Sign in to Gmail if asked.
2. Click through the *"This app hasn't been verified by Google yet"* warning — Continue → Allow.
3. Reload Gmail. Click the **emAIl Sentinel** icon in the right rail.

**Tell us out loud:** What does the home card look like to you? What do you think this product does, in your own words?

### Task 2 — Configure Gemini and SMS provider (6 min)

1. Click **Settings** from the home card.
2. Paste the Gemini API key into the **Gemini API key** field. Click **Save settings**, then **Test Gemini** — confirm *"Gemini OK"*.
3. Scroll down to **SMS provider** in Settings. Open the dropdown — pick **Textbelt**.
4. A field appears for the Textbelt API key. Paste the literal string `textbelt` (lowercase, no quotes). Save settings.
5. Below the provider section, find **SMS recipients**. Click **+ Add SMS recipient**.
6. Give the recipient any name (e.g. "My phone"). Pick the country code that matches your phone (United States is the default `+1`). Type your phone number digits only — no spaces, no dashes, no country code (e.g. `5551234567` for a US number). Save.
7. Back in Settings, find the **Send test SMS to** section. Pick the recipient you just added (or paste your number directly). Click **Send test SMS**.

**Tell us out loud:** Did the test SMS arrive on your phone? About how long did it take? Was anything about the SMS provider setup confusing — particularly the "API key" or "Textbelt" terminology?

### Task 3 — Create a rule that texts you (5 min)

1. Return to the home card. Click **Rules** → **+ New rule**.
2. Name it whatever you want (e.g. "Important demo emails").
3. In **Gmail labels to watch**, type `INBOX`.
4. In **Rule text**, write a plain-English description: e.g. *"Any email with the word DEMO in the subject line."* (You can use the **Help me write the rule text** AI suggestion if you want.)
5. Under **Alert channels**, find the **SMS** section and tick the recipient you added in Task 2.
6. Click **Save**.

**Tell us out loud:** Did anything in the rule editor surprise you? When you ticked the SMS recipient, did you trust that an alert would actually fire?

### Task 4 — Send yourself a test email and confirm the SMS arrives (4 min)

1. In Gmail, click **Compose**. Send yourself an email with the subject line `DEMO test 1` (the trigger word from your rule).
2. Wait about 10 seconds for delivery.
3. Open the emAIl Sentinel add-on. Click **Scan email now**.
4. After a few seconds you should see *"Scan complete — 1 new email, 1 match"*.
5. Within ~30 seconds, you should receive a text message on your phone reading something like *"[emAIl Sentinel] Important demo emails — Date: ... — From: yourself — Subject: DEMO test 1 — ..."*.

**Tell us out loud:** Did the SMS arrive? Was the text message clear and useful — would you actually want to receive an SMS like this for a real important email?

### Task 5 — Wrap-up questions (2 min)

1. In your own words, **what does this product do**?
2. **What was confusing** about setting up the SMS provider specifically? (The Gemini key, the Textbelt API key, the country code, the phone number digit format — call out which steps tripped you up.)
3. **What did you expect to happen** that didn't?
4. The product will cost **$4.99/month** (or $39/year) for unlimited rules and additional alert channels. SMS itself is included in the free plan; the SMS provider's own per-message fees (~$0.005–$0.05 depending on provider) are billed separately by the provider. **Would you pay $4.99/month for this** if you also had to pay your SMS provider directly? Why or why not?
5. **Who do you know** who would benefit from this product? (Job titles or scenarios, no names needed.)

---

## Notes for the developer (not shown to tester)

- Textbelt's free `textbelt` token is rate-limited to one SMS per day per IP/account. If a tester re-runs the test mid-session (e.g. they got the rule wrong the first time), the second SMS will be rejected. That's itself useful UX data — does the activity log error message make the limit clear?
- Country-code dropdown + digits-only field is the recent split (replacing the previous E.164 single-input). Pay close attention to whether testers immediately understand the format.
- `Bearer ` prefix is NOT required for Textbelt — it's a different auth model from Twilio/Telnyx/Plivo. Verify the Settings UI doesn't tell testers to add `Bearer ` for Textbelt.
- If a tester is on Android with iMessage-style RCS, the SMS text rendering may differ from iOS. Note any rendering oddities.
