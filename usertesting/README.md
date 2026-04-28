# UserTesting workspace

Everything to do with paid usability-testing rounds for emAIl Sentinel — task scripts, the per-round outgoing artifacts you submit to UserTesting.com, the per-round incoming artifacts you download back, and the triage / findings notes that come out of each round.

## Layout

| Subdirectory | Committed to git? | Contents |
|---|---|---|
| `docs/` | ✅ yes | Canonical task scripts, screener questions, triage template, pre-flight setup walkthrough. The reusable templates that *don't* contain per-round secrets. |
| `outgoing/` | ❌ no — gitignored | Per-round filled scripts with real `<DEV_GEMINI_KEY>` and `<TEST_DEPLOYMENT_URL>` substituted in. These are *secrets-bearing* working files copied from `docs/` and edited locally for each round before pasting into the UserTesting platform. Don't commit. |
| `incoming/` | ❌ no — gitignored | Downloaded session recordings, transcripts, and any raw tester output from the UserTesting platform. May contain tester PII (email addresses, phone numbers, faces in webcam recordings if enabled). Don't commit. |
| `findings/` | ✅ yes | Triage docs filled out from the recordings, plus per-round summaries. Sanitized — no PII, just summarized findings, severity, fix status. These get committed because they're the durable artifact of each round. |

## Per-round workflow

For each Round N (N = 1, 2, …):

1. **Prep (Steps 1–3 of `docs/preflight_setup.md`).** Sandbox GCP project + capped Gemini key, Apps Script test deployment, pre-flight self-test on a fresh non-dev account.
2. **Outgoing (Step 4).** Copy `docs/script_a_core.md` and `docs/script_b_power.md` to `outgoing/round_<N>/` as *filled* working files (`script_a_core_filled.md`, `script_b_power_filled.md`). Replace placeholders. Paste into UserTesting's task editor. Submit and pay.
3. **Wait.** Sessions trickle back over 1–2 weeks. UserTesting emails you when each completes.
4. **Incoming.** As recordings arrive, download them (UserTesting → Test → individual session → Download MP4) and any auto-generated transcripts to `incoming/round_<N>/`. Optionally download the platform's notes export.
5. **Findings.** `cp docs/triage_template.md findings/round_<N>_<YYYY-MM-DD>_findings.md`, fill in the table while watching the recordings. After the round closes, write `findings/round_<N>_summary.md` capturing top issues, fix priorities, and the "would you pay $4.99/month?" yes-rate.
6. **Fix.** Land critical / important fixes in the codebase. Update the **Fix status** column in the findings file as each is shipped.
7. **Rotate secrets.** Revoke the Round-N Gemini key and create a fresh test deployment URL before Round N+1 — Round-N testers shouldn't retain working access.

## Why outgoing/ and incoming/ are gitignored

- **outgoing/** holds files with the real Gemini API key embedded. The key is your sandbox-project credential, but it still costs real money if exfiltrated and gets logged in git history forever even after rotation.
- **incoming/** holds tester recordings that may show their email inbox, phone number, voice, and (if webcam was enabled) face. Even if your participants consented to UserTesting's standard ToS, committing recordings to a public-or-could-go-public repo is a privacy escalation you don't need.

The directories themselves are kept (with `.gitkeep`) so the structure is obvious without having to read this README.

## Reference

- **Pre-flight walkthrough:** `docs/preflight_setup.md`
- **Task script — core flow:** `docs/script_a_core.md`
- **Task script — SMS path:** `docs/script_b_power.md`
- **Triage template:** `docs/triage_template.md`
- **Round-1 plan summary:** memory file `project_pre_launch_todo.md` (Testing section) and the locked plan at `~/.claude/plans/should-i-run-a-wondrous-hollerith.md`.
