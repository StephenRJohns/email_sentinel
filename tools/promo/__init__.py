"""tools.promo — local admin tool for the standalone Pro promo-code service.

Talks to the Apps Script Web App that hosts PromoCodeService.gs +
PromoCodeAdmin.gs (in scripts/). Replaces the manual editor flow
(BATCH_NAME = ... / runGenerateBatch / runVoidCode / etc.) with a Python
CLI and a local Flask web UI that share one HTTP client.

──────────────────────────────────────────────────────────────────────────
ONE-TIME SETUP (after the standalone Apps Script project is already
configured for the redemption flow)
──────────────────────────────────────────────────────────────────────────

  1. In the standalone project, generate an admin token:
       python3 -c "import secrets; print(secrets.token_hex(20))"
     (or any other strong random hex / base64 string.)

  2. Open scripts/PromoCodeService.gs in the standalone project. Edit the
     `configureAdminToken()` function: paste the token into the `token`
     variable. Run that function from the editor's function dropdown.
     REVERT the token back to '' before any future commit.

  3. Re-deploy the standalone project as a Web App (Manage deployments ->
     bump the version) so the extended doPost is live. The deployment URL
     is unchanged unless you create a new deployment.

  4. Locally, copy tools/promo/.env.example to tools/promo/.env and fill in:
       PROMO_SERVICE_URL    — the Web App URL (same one the add-on uses)
       PROMO_ADMIN_TOKEN    — the random token from step 1

  5. Install the Python deps:
       cd tools/promo && pip install -r requirements.txt

──────────────────────────────────────────────────────────────────────────
USAGE
──────────────────────────────────────────────────────────────────────────

CLI examples (run from repo root):

  python -m tools.promo.cli mint usertest-round-002 10 --label "round 2"
  python -m tools.promo.cli list --batch usertest-round-002
  python -m tools.promo.cli assign SENT-22ZB-CM8U \\
      --name "Jane Doe" --email jane@example.com --ut-session UT-12345
  python -m tools.promo.cli void SENT-22ZB-CM8U
  python -m tools.promo.cli void-batch usertest-round-002

Web UI:

  python -m tools.promo.server
  # opens http://127.0.0.1:5057

──────────────────────────────────────────────────────────────────────────
LOCAL TRACKING FILES (promo_codes/<batch>.txt)
──────────────────────────────────────────────────────────────────────────

Minting via this tool auto-writes a tracking file at
promo_codes/<batch-name>.txt with all codes pre-populated. On assign / void,
the tool globs promo_codes/*.txt and updates whichever file claims the code
(found by code match, not by filename). Codes minted outside this tool —
e.g. via the editor's runGenerateBatch — will not have a tracking file
unless one is created separately; assign/void still works against the Sheet
in that case but will silently skip the local update.

The promo_codes/ directory is gitignored at repo root.

──────────────────────────────────────────────────────────────────────────
SECURITY NOTES
──────────────────────────────────────────────────────────────────────────

- PROMO_ADMIN_TOKEN is a master key. A leak gives an attacker the ability
  to mint Pro grants. Keep it out of source control. Rotate periodically by
  re-running configureAdminToken in the standalone project with a new value
  and updating tools/promo/.env locally.

- The Flask server has NO password and binds to 127.0.0.1 only. Do not
  change PROMO_BIND_HOST without adding auth — anything reachable on a
  network port can call /mint, /void, /assign without authentication.

- The Apps Script doPost still requires a valid token (SERVICE_TOKEN or
  ADMIN_TOKEN) on every request, so an unauthenticated network attacker
  cannot drive the Web App directly. The Flask server is the only
  network-exposed unauth surface, hence the localhost-only default.
"""
