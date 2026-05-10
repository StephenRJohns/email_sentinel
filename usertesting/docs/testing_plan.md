# emAIl Sentinel — User Testing Plan

Two parallel testing programs. Script A validates the core onboarding and five-Google-channel flow with recruited strangers via a paid panel. Script C validates the SMS provider setup path with direct-recruited testers who already have provider accounts. Both run as unmoderated screen recordings.

---

## Goals

| Goal | Script | Success signal |
|---|---|---|
| Core install and setup is clear to a first-time user | A | Task completion rate > 80 %; < 2 critical blockers per round |
| Home card communicates what the product does within 30 seconds | A | Tester describes the product accurately in Task 1 without reading the briefing |
| Five Google channels fire reliably from a single rule | A | Calendar, Sheets, Tasks, Docs, Chat all appear in Task 4 recordings |
| Chat webhook setup is achievable without coaching | A | > 50 % of testers complete 2c unassisted |
| SMS provider credential setup is navigable without support | C | Tester enters correct credentials on first attempt > 60 % of the time |
| Test SMS arrives within 30 seconds for each supported provider | C | All six providers pass timing threshold |
| Error messages are actionable when credentials are wrong | C | Tester can self-correct from the error toast alone without reading docs |

---

## Script A — Core install + five Google channels

### What it tests

The critical first-use path for a new Google Workspace user: install the add-on, enter a Gemini API key, redeem a Pro promo code, set up a Google Chat space webhook, create a rule with all five Google alert channels selected, send a test email, run a scan, and verify alerts appear in Calendar, Sheets, Tasks, Docs, and Chat.

Session length: 20 minutes, unmoderated, screen + audio recording.

### Who we need

All five criteria are required:

- Uses Gmail daily as their primary email account
- Receives 50 or more emails per day (work and personal combined)
- Works in one of: small business owner, freelancer or consultant, salesperson, real estate agent, paralegal, recruiter, or a role where missing an important email has real consequences
- Located in the United States
- Google Chat is enabled on their account (Spaces sidebar visible at chat.google.com)

One of these two is also required:

- Has installed a Gmail add-on, browser extension, or Workspace add-on before
- Is comfortable installing software in their browser when given a link

### How to find them

UserTesting.com handles all recruiting. Submit the test once with the screener questions from `script_a_core.md` configured as qualification filters. The platform recruits, schedules, and pays participants automatically — sessions return over 1–2 weeks.

Set up instructions: `docs/preflight_setup.md`, Step 4d.

### Session count and cost

| Round | Sessions | Platform cost | When |
|---|---|---|---|
| Round 1 | 10 | ~$490 ($49 × 10) | Before Marketplace submission |
| Round 2 (follow-up) | 5 | ~$245 | After critical fixes ship, before re-submission |

Round 2 is optional but strongly recommended if Round 1 surfaces critical blockers (issues affecting more than five out of ten testers). A two-round cost of ~$735 is the realistic budget.

### Developer time

| Activity | Time |
|---|---|
| Step 1–2 (GCP sandbox + Marketplace SDK install URL, one-time) | 2–3 hours |
| Step 3 (pre-flight self-test each round) | 30 min + up to 60 min fixes |
| Step 4 (mint codes, fill scripts, submit to UserTesting) | 30 min |
| Step 5 (triage recordings + fix) | 3–4 hr review + 4–10 hr fixes |
| **Total per round** | **~12–14 hours of dev time over ~3 weeks** |

### Pre-round checklist

- [ ] GCP sandbox project created with capped Gemini key (`step1_create_sandbox.sh`)
- [ ] Marketplace SDK install URL live and validated on a fresh Google account (`step2a_enable_sdk.sh` + manual steps 2b–2f)
- [ ] `PROMO_SERVICE_URL` Script Property set on the test-deployment project
- [ ] Pre-flight self-test (`run_script_a.sh` + `walk_script_a.sh`) passes in under 14 minutes
- [ ] 11 promo codes minted (`tools/promo/cli.py mint`) — 10 for testers, 1 reserve
- [ ] Scripts filled with real values (`step4b_fill_scripts.sh`) and reviewed — no placeholder strings visible
- [ ] UserTesting test submitted and payment processed

---

## Script C — SMS provider validation

### What it tests

The SMS setup path: install the add-on, enter a Gemini API key, locate and enter provider credentials (Account SID, Auth Token, API key, etc.) into the Settings card, add a recipient phone number, send a test SMS, create a rule with SMS enabled, and confirm a triggered text arrives on the phone.

Session length: 20 minutes, unmoderated, screen + audio recording (Loom or equivalent is acceptable if the tester cannot use UserTesting's recorder).

No promo codes are needed — SMS works on the Free tier.

### Providers and session targets

| Provider | Sessions | Priority |
|---|---|---|
| Twilio | 2 | 1 (highest real-world adoption) |
| Telnyx | 2 | 1 |
| ClickSend | 2 | 2 |
| Vonage | 2 | 2 |
| Plivo | 1–2 | 3 |
| Textbelt | 1–2 | 3 |
| **Total** | **6–12** | |

Recruit for Twilio and Telnyx first. Do not wait for all providers to be filled before starting sessions — Twilio findings will return while you are still recruiting for Vonage.

### How to find testers (no personal network required)

Script C testers must already have an active account with the assigned provider. Because you are recruiting from scratch, plan to contact roughly twice as many candidates as you need — expect a 40–50 percent drop-off from initial response to completed session.

Target to contact per provider: 4–6 candidates to land 1–2 completed sessions.

#### Sourcing channel comparison

Sorted by likelihood of finding a qualified match. All channels are free unless noted.

| Channel | Likelihood | Why | Providers covered | Monetary cost | Time to post | Follow-up effort |
|---|---|---|---|---|---|---|
| **r/Twilio** | **Very high** | Every member has an active Twilio account — it is the only reason to be in that sub | Twilio only | Free | 5 min | Low — replies are self-selecting |
| **GitHub cold outreach** | **High** | You verify account use before contacting — only reach out to people with recent commits using the provider's SDK | All six providers | Free | 30–60 min per provider to find candidates | Medium — manual DMs, ~10–20% reply rate |
| **Twilio / Telnyx Discord** | **High** | Official developer Discords; everyone present uses the product | Twilio, Telnyx | Free | 5 min per server | Low — one post, replies come to you |
| **Indie Hackers** | **Medium-high** | SaaS founders skew heavily toward Twilio and SMS notifications; high engagement with "looking for testers" posts | Twilio, Telnyx, Vonage, Plivo | Free | 10 min | Low — public post, self-selecting |
| **WIP / Startup Study Group Slack** | **Medium** | Active indie maker communities; members build products with SMS features regularly | Twilio, Telnyx, ClickSend | Free | 10 min per community | Low — post once |
| **r/SaaS / r/webdev** | **Medium** | Broad developer audience; SMS users are present but not the majority | All providers | Free | 5 min | Medium — lower signal, more screening needed |
| **Product Hunt makers** | **Medium-low** | Founder-heavy but skews toward product and marketing roles more than technical SMS integration | Twilio, ClickSend | Free | 10 min | Medium — engagement varies widely by timing |
| **LinkedIn cold outreach** | **Low** | Cannot verify account use before contacting; ~5–10% reply rate; InMail costs money beyond free tier | All providers | Free (connection request) or ~$10–15/InMail | 30 min per provider | High — low signal, high volume needed |

**Key takeaways:**

- Start with r/Twilio and the Twilio/Telnyx Discords — highest certainty per minute spent, covers your two highest-priority providers.
- GitHub cold outreach is the most reliable path for the remaining four providers (ClickSend, Vonage, Plivo, Textbelt) because those communities have no dedicated forum. Pre-verification means you do not waste scripts on people who cannot complete the session.
- Indie Hackers fills the gap — one post can surface candidates for multiple providers simultaneously.
- Skip LinkedIn unless the other channels fail to fill Vonage or Plivo slots. The effort-to-result ratio is the worst of the group.

---

#### Where to find candidates

**Reddit (free, highest volume)**

The following subreddits have active members who have built with SMS APIs. Post in the weekly "help" or "showcase" threads rather than making a standalone post, which is more likely to be removed.

| Subreddit | Best match | What to look for |
|---|---|---|
| r/Twilio | Twilio testers | Any active member — everyone there has a Twilio account |
| r/SaaS | Twilio, Telnyx, Plivo | Founders who mention SMS in product descriptions |
| r/webdev | Twilio, Telnyx | Developers who mention SMS integrations |
| r/selfhosted | Any provider | Technical users, often have Vonage or Textbelt accounts |
| r/sysadmin | Twilio, Vonage | IT professionals who manage SMS notification systems |

Sample post for r/Twilio (adapt for other subreddits):

> I am running a 20-minute usability test for a new Gmail add-on that uses Twilio to send SMS alerts when specific emails arrive. I need 2 people who have an active Twilio account (free trial or paid). Unmoderated — you follow a written script, record your screen with Loom, and send me the link. No coding required. Happy to offer a $20 Amazon gift card as a thank-you. DM me if interested.

**Indie Hackers (free, high signal for SaaS founders)**

Post a "Looking for testers" message in the main community feed at indiehackers.com/post. Indie Hackers members skew heavily toward founders and developers who have built SMS features. Filter replies by asking which provider they use before sending the script.

Sample post:

> Looking for 2–3 people who have a Twilio, Telnyx, Vonage, or ClickSend account for a quick usability test. I am building a Gmail add-on that sends SMS alerts on email matches — 20 minutes, unmoderated, record your screen with Loom. $20 gift card thank-you. Reply with which provider you use.

**Product Hunt makers community (free)**

Go to producthunt.com/discussions and start a discussion in the "Feedback" category. Alternatively, join the "Makers" ship community at ship.producthunt.com. Founders launching SMS-adjacent tools are common here and are familiar with Twilio and Telnyx.

**Hacker News (free, developer-heavy)**

Search news.ycombinator.com for recent "Ask HN: Who is hiring" or "Show HN" threads in the SMS or notifications space. You can also post a brief "Ask HN: Looking for testers with Twilio or Telnyx accounts" comment — keep it very short (three sentences), link to a brief description, and offer a clear incentive.

**Twilio developer community Discord (free)**

Twilio maintains an official Discord server (search "Twilio Discord" — the invite link changes; find the current one at twilio.com/docs or their GitHub). The #general and #help channels have active Twilio users. Do not spam — post once in an appropriate channel and respond to anyone who DMs.

**Telnyx Discord (free)**

Telnyx has a developer Discord accessible from their developer portal at telnyx.com. Same approach as Twilio Discord.

**GitHub cold outreach (free, most targeted)**

This is the most reliable method for finding people with active provider accounts, because you can verify the account use before reaching out.

For each provider, search GitHub:

```
twilio site:github.com language:Python OR language:JavaScript OR language:Ruby pushed:>2024-01-01
telnyx site:github.com pushed:>2024-01-01
vonage site:github.com pushed:>2024-01-01
plivo site:github.com pushed:>2024-01-01
```

Or use GitHub's code search directly:

- Go to github.com/search
- Search: `twilio language:Python` (or JavaScript, Ruby, PHP) with filter "Recently updated"
- Find repositories with recent commits that use the provider's SDK
- Click through to the repository owner's GitHub profile
- If they have a public email or Twitter/X handle listed, contact them there

Sample cold DM (adapt for each provider):

> Hi — I found your [project name] repo on GitHub and noticed you are using Twilio. I am running a 20-minute usability test for a Gmail add-on that sends SMS alerts via Twilio when specific emails arrive. I am looking for 1–2 people with active Twilio accounts to run through a written test script (unmoderated — no call required) and record their screen. Happy to offer a $20 Amazon gift card. Would you have 20 minutes in the next two weeks? No coding involved — purely clicking through a UI.

**LinkedIn (free, professional context)**

Search LinkedIn for "Twilio developer", "SMS API integration", "Vonage developer", or "Telnyx". Filter by location (United States) and connection degree. Send a brief InMail or connection request with a note. LinkedIn cold outreach has low response rates (5–10 percent) so contact more people.

**Product and SaaS-specific Slack communities (free)**

Several free Slack communities have members who use SMS APIs:

- **WIP (wipapp.com)** — indie makers, many with Twilio accounts
- **Startup Study Group** — early-stage founders
- **Online Geniuses** — digital marketers who use SMS notification services

Post in the #looking-for-feedback or #tools channels in any of these. The same brief post used for Indie Hackers works here.

#### Screening before sending the script

Before sending a tester their filled Script C file, ask two screening questions by DM or email:

1. Do you have an active [provider name] account — not just a signup, but one you have actually used to send at least one SMS?
2. Are you in the United States?

If yes to both, send the script. Do not send the script to anyone who has only signed up but never sent a message — they will be blocked at the credentials step and the session will not produce useful data.

#### Incentive guidance

An incentive is not required — several people will participate out of genuine interest. However, offering one increases response rates and reduces no-shows.

Recommended: **$20 Amazon gift card** sent via email after you receive the Loom recording. Do not send payment before you receive the recording.

At 12 sessions maximum, total incentive budget: **up to $240**.

Most testers from the GitHub and developer Discord paths will participate without incentive if you frame it as mutual — you are improving a tool that uses their provider.

### Developer time

| Activity | Time |
|---|---|
| Steps 1–3 (fill `sms_preflight.env`, validate providers, Gemini key setup) | ~25 min |
| Step 4 (pre-flight self-test with one provider) | ~20 min |
| Step 5 (recruit, assign, distribute scripts) | ~30 min + ongoing follow-up as replies come in |
| Triage recordings + fix | ~2–4 hr review + fixes |
| **Total** | **~6–8 hours of dev time over ~2–3 weeks** |

### Pre-round checklist

- [ ] `tools/preflight/sms_preflight.env` created and credentials filled for all providers you plan to test
- [ ] `validate_sms_providers.sh` passes (all target providers show ✅ ✅) — fix any ❌ before recruiting
- [ ] Gemini sandbox key and deploy URL available (reuse from Script A round or create fresh)
- [ ] Pre-flight self-test passes with at least one provider in under 14 minutes
- [ ] Recruiting posts live in at least three of the channels listed above
- [ ] Screening questions asked and answered before sending any script

---

## Combined schedule

The two scripts can run in parallel — there is no dependency between them. A reasonable sequence given that Script A requires more setup:

| Week | Activity |
|---|---|
| Week 1 | Complete Script A Steps 1–2 (GCP sandbox + Marketplace SDK install URL — the long step). Start Script C recruiting posts simultaneously. |
| Week 2 | Script A Steps 3–4: pre-flight self-test + submit to UserTesting. Script C: screen incoming recruiting replies, assign providers, send filled scripts. |
| Weeks 3–4 | Script A sessions return (UserTesting trickles results). Script C sessions return as testers complete at their own pace. |
| Week 5 | Triage all recordings from both scripts. Fix critical findings. |
| Week 6 | Optional: Script A Round 2 (5 sessions) to verify fixes. |

---

## Cost summary

| Item | Cost |
|---|---|
| Script A Round 1 — 10 UserTesting sessions | ~$490 |
| Script A Round 2 — 5 follow-up sessions (recommended) | ~$245 |
| Script C — platform fees | $0 |
| Script C — tester incentives (optional, up to 12 sessions) | $0–$240 |
| Gemini sandbox API usage (capped at $5/round) | $0–$10 |
| **Total range** | **~$490–$985** |

Minimum viable (Round 1 only, no incentives): **~$490**
Full program (both rounds, Script C with incentives): **~$985**
