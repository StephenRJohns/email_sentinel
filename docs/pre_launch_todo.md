# Pre-Launch TODO (early snapshot — kept for reference)

> **This file is an early-development snapshot and is not authoritative.** It is retained for historical reference only. The current, maintained pre-launch tracker lives outside the repository.
>
> Known status updates since this snapshot was written (as of 2026-04-23):
> - Trademark filing — completed; USPTO serial 99761473, filed 2026-04-23.
> - Lawyer review — identified; appointment pending.
> - **US-only launch decision (2026-04-25):** Item 4 (GDPR legal basis) is moot — the Service is now restricted to US users only. See `legal/TERMS.md` § 2 and `legal/PRIVACY.md` § 9. EU/UK launch deferred until demand justifies the EU representative cost.
> - **Beta-test approach decided (2026-04-28):** Round 1 = 10 unmoderated UserTesting.com sessions, mixed Scripts A (core install + first rule, 6 sessions) and B (power user / SMS, 4 sessions). Cost ~$490, 1–2 weeks turnaround, runs in parallel with the OAuth-verification wait. No code changes (no per-tester Pro comp; one-shot sessions don't need persistent Pro access). Task scripts and triage template live in `docs/usertesting/`. Replaces the originally-considered personal-network beta — the developer doesn't have a qualified-tester network. Founding Member tier remains a separate launch concern, unrelated to the UserTesting round.
> - See `docs/marketplace_checklist.txt` for the current Marketplace submission guide.

┌─────┬─────────────────────────────────────────────────────────────────────┬───────────────────┬─────────────────┐
│  #  │                                Item                                 │        Who        │     Status      │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│  1  │ OAuth verification video — record with OBS + submit to Google       │ Stephen           │ ❌              │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│  2  │ Marketplace screenshots — 5 × 1280×800                              │ Stephen           │ ❌              │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│  3  │ Google Workspace Marketplace store listing                          │ Stephen           │ ❌              │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│  4  │ PRIVACY.md — GDPR legal basis (consent → legitimate interest)       │ Lawyer            │ ❌              │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│  5  │ PRIVACY.md — CCPA section expansion                                 │ Lawyer            │ ❌              │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│  6  │ LICENSE — define "authorized end users"                             │ Lawyer            │ ❌              │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│  7  │ Full lawyer review of all legal docs                                │ Lawyer            │ ❌              │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│  8  │ E2E test config — fill in credentials & run suite                   │ Stephen           │ 🔄 In progress  │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│  9  │ OAuth consent screen — move to Production (not Testing)             │ Stephen           │ ✅ Done         │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│ 10  │ GitHub repo description & topics (marketplace SEO)                  │ Stephen           │ ✅ Done         │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│ 11  │ PRIVACY.md — clarify "encrypted-at-rest" is Google's infrastructure │ Done              │ ✅ Done         │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│ 12  │ E2E test plan — converted to Markdown, updated for latest UI        │ Done              │ ✅ Done         │
├─────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼─────────────────┤
│ 13  │ Playwright E2E automation suite                                     │ Done              │ ✅ Done         │
└─────┴─────────────────────────────────────────────────────────────────────┴───────────────────┴─────────────────┘
