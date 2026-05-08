#!/usr/bin/env bash
# Wrapper around run_free_e2e_tests.sh that runs only the Script A spec
# (testing/playwright/tests/script_a.spec.js). Mirrors the seven tasks in
# usertesting/docs/script_a_core.md (Round 1 — five Google channels).
#
# Usage:
#   ./testing/run_script_a.sh                        # all seven Script A tests
#   ./testing/run_script_a.sh --grep "Task 2a"       # one task; args pass through
#   ./testing/run_script_a.sh --debug                # Playwright Inspector
#
# See testing/playwright/USER_TESTING_SCRIPTS.md for per-task pre-flight
# reminders (Gemini key, promo code, Chat webhook URL, etc.).

echo "============================================================"
echo "  SCRIPT A — five Google channels (UserTesting Round 1)"
echo "============================================================"
echo "  Mirrors usertesting/docs/script_a_core.md."
echo ""
echo "  Per-task pre-flight (set in testing/playwright/e2e.config.env):"
echo "    T2a   GEMINI_API_KEY"
echo "    T2b   TEST_PROMO_CODE  (single-use; mint a fresh code each run)"
echo "    T2c   CHAT_WEBHOOK_URL (and optionally CHAT_SPACE_NAME)"
echo "    T4    GOOGLE_EMAIL     (a real email is sent + Gemini scan runs)"
echo ""
echo "  Missing env vars cause the affected task to skip cleanly."
echo "  See testing/playwright/USER_TESTING_SCRIPTS.md for details."
echo "============================================================"
echo ""

exec "$(dirname "$0")/run_free_e2e_tests.sh" tests/script_a.spec.js "$@"
