# outgoing/ — filled task scripts ready for UserTesting

**Gitignored.** Contents of this directory are NOT committed to git.

## What goes here

Per-round filled copies of the task scripts from `../docs/`. The `<DEV_GEMINI_KEY>` and `<TEST_DEPLOYMENT_URL>` placeholders in the canonical scripts are replaced with real values for the round, ready to paste into UserTesting's task editor.

## Convention

```
outgoing/
├── round_1/
│   ├── script_a_core_filled.md
│   ├── script_b_power_filled.md
│   └── notes.md          # any per-round prep notes (Gemini key location, deployment URL, etc.)
├── round_2/
│   └── …
```

## Why this is gitignored

The filled scripts contain a working Gemini API key. Even though it's a sandbox-project key with a $5 budget cap, committing it to git would log it permanently in repo history — every fork and clone would have it forever, even after rotation. Better to never let it touch the working tree's tracked state.

## When you're done with a round

Rotate the Gemini key (revoke the Round-N key in the GCP project, generate a fresh one for Round N+1). Either delete the round's `outgoing/round_N/` directory or move it elsewhere. The historical context is preserved by the matching `findings/round_N_*` files which ARE committed.
