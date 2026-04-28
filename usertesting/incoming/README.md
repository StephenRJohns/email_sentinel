# incoming/ — downloaded UserTesting session artifacts

**Gitignored.** Contents of this directory are NOT committed to git.

## What goes here

Per-round downloads from the UserTesting platform. As each session completes, fetch its artifacts and drop them under `round_N/`.

## Convention

```
incoming/
├── round_1/
│   ├── recordings/
│   │   ├── 01_<tester_id_or_session_id>.mp4
│   │   ├── 02_<tester_id_or_session_id>.mp4
│   │   └── …
│   ├── transcripts/
│   │   ├── 01_<session_id>.txt   # if auto-transcribed by UserTesting
│   │   └── …
│   └── platform_notes.md         # any structured notes the platform exposes
├── round_2/
│   └── …
```

## Why this is gitignored

Tester recordings can show:

- **The tester's actual Gmail inbox** — including recent unread mail, sender names, subject lines.
- **Their phone number** if Script B (SMS path) ran.
- **Their voice** narrating throughout the session.
- **Their face**, if UserTesting's webcam recording was enabled.

Even though every participant agreed to UserTesting's standard recording ToS, committing those recordings to git turns them into a permanent, forkable artifact. Bad privacy posture for what's already paid for and accessible via the UserTesting platform when you need to re-watch.

## What you SHOULD commit

After watching the recordings and filling out the triage findings file (sanitized, no PII, just summarized issues + fix status), commit the FINDINGS file under `../findings/`. That's the durable artifact of the round. The recordings stay here as your local working copy until you don't need them anymore.

## When you're done with a round

Once findings are written and fixes are shipped, you can either:

- **Keep the recordings** as a local archive (in case you need to re-watch a specific moment 6 months later when triaging a related bug).
- **Delete the recordings** to reclaim disk and reduce the local PII surface. UserTesting retains them on the platform — you can re-download if needed.

Either is fine. Just don't commit them.
