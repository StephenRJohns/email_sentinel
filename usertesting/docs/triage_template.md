# UserTesting — Round triage template

Copy this file to `usertesting/findings/round_<N>_<YYYY-MM-DD>_findings.md` at the start of each triage pass and fill it in as you watch the recordings.

---

## Severity rules

| Severity | When to use |
|---|---|
| **Critical** | Hit by 5+ of 10 testers, or any single tester completely fails to reach Task 4 (alert delivered). Fix before Marketplace submission. |
| **Important** | Hit by 2–4 of 10 testers, or causes substantial confusion / time loss but doesn't block task completion. Fix before Marketplace submission if budget allows; document in known-issues otherwise. |
| **Backlog** | Hit by 1 tester only AND not a regression of a documented behavior. Triage for post-launch backlog. |

A tester who quits at the unverified-app warning counts as a finding, but the severity is informational rather than fixable until OAuth verification clears.

---

## Findings table

Add one row per distinct finding. Group rows by section / surface where possible (install funnel, Settings, rule editor, etc.) to make patterns visible.

| # | Tester ID | Recording timestamp | Surface | Issue (1–2 sentences) | Quotes / verbatim | Severity | Fix status |
|---|---|---|---|---|---|---|---|
| 1 |   |   |   |   |   |   | not started |
| 2 |   |   |   |   |   |   | not started |
| 3 |   |   |   |   |   |   | not started |

**Column notes:**

- **Tester ID** — the platform's per-session identifier (UserTesting calls these tester usernames or session IDs).
- **Recording timestamp** — `MM:SS` into the video where the issue starts. Helps when you need to re-watch a specific moment.
- **Surface** — short tag: `install`, `settings`, `rule-editor`, `home-card`, `activity-log`, `alert-delivery`, etc. Lets you group issues by code area when triaging.
- **Issue** — what went wrong from the tester's perspective. Avoid jumping to fix — capture the symptom, not the proposed solution.
- **Quotes** — verbatim "this is confusing", "I don't know what that means", "I'd expect…" lines from the tester. The strongest signal in the recording.
- **Severity** — `critical` / `important` / `backlog`, picked using the rules above.
- **Fix status** — `not started` / `in progress` / `fixed in commit <sha>` / `documented as known-issue` / `won't fix`.

---

## Round summary (fill in after triage)

| Metric | Round 1 |
|---|---|
| Sessions submitted | 10 |
| Sessions completed (reached Task 4 or 5) |   |
| Sessions abandoned (quit before Task 4) |   |
| Critical findings |   |
| Important findings |   |
| Backlog findings |   |
| Top 3 critical issues by tester count | 1. <br> 2. <br> 3. |
| Most quoted phrase / pain point |   |
| % of testers who said "yes" to "would you pay $4.99/month?" |   |
| Round cost | $   |

## Action items

After grouping, list the fix-this-before-Marketplace work as a checked todo:

- [ ] Critical fix #1 — <issue> — owner: stephen — target: <date>
- [ ] Critical fix #2 — …
- [ ] Important fix #1 — …
