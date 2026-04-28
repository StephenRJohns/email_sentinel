# UserTesting — Script A: Core install + first rule

**Target session length:** 15 minutes (unmoderated, screen + audio recording)
**Cohort within Round 1:** 6 of 10 sessions
**Pre-supplied to tester:**
- Test-deployment install URL (issued by developer; see "Pre-flight" section below)
- Gemini API key (rotate after the round; see "Credentials" section)

---

## What this product is (one-line summary for tester intro)

emAIl Sentinel is a Gmail add-on that watches your inbox and sends you alerts (Calendar event, SMS, etc.) when emails matching plain-English rules arrive — for example, "alert me when I get an email from any client mentioning a deadline."

---

## Screener questions (submit with the test on UserTesting)

Tester must answer **yes** to all four to qualify:

1. Do you use Gmail daily as your primary email account?
2. Do you receive 50+ emails per day in Gmail (work + personal combined)?
3. Are you in one of these roles: small business owner, freelancer/consultant, salesperson, real estate agent, paralegal, recruiter, or another role where missing an important email has real consequences?
4. Are you in the United States?

Tester must answer **yes** to one of:

5a. Have you ever installed a Gmail add-on, browser extension, or Workspace add-on before?
5b. Are you comfortable installing software in your browser when given a link?

---

## Tester briefing (read by tester at session start)

You're going to test a Gmail add-on called emAIl Sentinel that's in private pre-launch testing. You'll install it, set it up, and create one rule to alert you when a specific kind of email arrives.

**Important — you'll see a warning page during install** that says *"This app hasn't been verified by Google yet."* That's expected — this is a private pre-launch test, not a publicly listed app. Click **Continue** and **Allow** when you see those screens.

Please **think aloud the entire time** — narrate what you're looking at, what you expect to happen, what's confusing, and what you'd do next. There are no wrong answers; we want to understand your honest reactions to the product.

---

## Pre-supplied credentials

(The developer fills these in for each round and rotates them after the round closes.)

- **Gemini API key:** `<DEV_GEMINI_KEY>` — paste this into Settings → Gemini API key when prompted.
- **Test-deployment install URL:** `<TEST_DEPLOYMENT_URL>` — the URL you'll visit to install the add-on.

---

## Tasks

### Task 1 — Install the add-on (3 min)

1. Open `<TEST_DEPLOYMENT_URL>` in your browser. Sign in to Gmail if asked.
2. You'll see a Google consent screen titled *"This app hasn't been verified by Google yet"*. Click **Continue** → review the permissions → click **Allow**.
3. Reload Gmail (`mail.google.com`). On the right side of your inbox, you should see a column of add-on icons. Click the **emAIl Sentinel** icon (it looks like a small shield or eye — find it).

**Tell us out loud:** What did you expect to see when the icon opened? What does the home card look like? In your own words, what does this product do?

### Task 2 — Configure the Gemini API key (2 min)

1. From the home card, click **Settings**.
2. Find the **Gemini API key** field at the top. Paste the key the moderator gave you: `<DEV_GEMINI_KEY>`.
3. Click **Save settings**. You should see a confirmation toast.
4. Click **Test Gemini**. You should see *"Gemini OK — model responded."*

**Tell us out loud:** Was anything about that step confusing? Did you understand what a "Gemini API key" is from the on-card text alone?

### Task 3 — Create your first rule (5 min)

1. Return to the home card (use the Home button or back arrow).
2. Click **Rules** → **+ New rule**.
3. Give the rule any name you want (e.g. "My first rule").
4. In **Gmail labels to watch**, type `INBOX`.
5. In **Rule text**, write a plain-English description of what kind of email should trigger this rule. Either type one yourself, or click **Help me write the rule text** and let the AI suggest one. Example: *"Any email with the word DEMO in the subject line."*
6. Under **Alert channels**, tick **Google Calendar — create an event**. (Don't tick anything else for this task.)
7. Click **Save**.

**Tell us out loud:** How did you decide what to type as the rule text? Was the AI assistance useful, confusing, or unnecessary? What did you expect to see after Save?

### Task 4 — Send yourself a test email and confirm the alert (3 min)

1. In Gmail, click **Compose**. Send yourself an email that should trigger the rule (e.g., subject line `DEMO test 1`).
2. Wait about 10 seconds for the email to land in your inbox.
3. Open the emAIl Sentinel add-on again. Click **Scan email now** on the home card.
4. After a few seconds you should see a result card: *"Scan complete — 1 new email, 1 match"* in green.
5. Open Google Calendar (`calendar.google.com`) — there should be a new event titled *"[emAIl Sentinel] My first rule: DEMO test 1"* on today's calendar around the current time.

**Tell us out loud:** Did the alert show up in Calendar? Was anything unexpected? How confident are you that this would work for a real email you cared about?

### Task 5 — Wrap-up questions (2 min)

Please answer these aloud:

1. In your own words, **what does this product do**? Could you explain it to a coworker?
2. **What was confusing** during this session?
3. **What did you expect to happen** that didn't?
4. The product will cost **$4.99/month** (or $39/year) for unlimited rules and additional alert channels (SMS, Google Chat, Slack/Asana via MCP). The free tier covers 3 rules and Calendar/Sheets/Tasks/SMS alerts. **Would you pay $4.99/month for this?** Why or why not?
5. **Who do you know** who would benefit from this product? (Optional — names not needed, just job titles or scenarios.)

---

## Notes for the developer (not shown to tester)

- The "unverified app" warning will be Google's standard consent screen until OAuth verification clears. Don't try to skip it — that bail rate is a useful pre-launch signal.
- Pre-supplied Gemini key should be on a dedicated dev account with a $5–10 billing cap. Rotate after the round.
- If a tester closes Gmail mid-task or the add-on icon doesn't appear after install, that's a finding — don't coach them around it.
- Watching the recordings: pay particular attention to Task 1 ("what does this product do") — if the home card doesn't communicate the value prop in 30 seconds without explanation, that's the highest-priority fix.
- If a tester runs out of time before Task 5, they still produce useful data — Tasks 1–4 cover the install funnel, which is what most matters before Marketplace launch.
