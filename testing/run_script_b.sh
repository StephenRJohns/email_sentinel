#!/usr/bin/env bash
# Wrapper around run_free_e2e_tests.sh that runs only the Script B spec
# (testing/playwright/tests/script_b.spec.js). Mirrors the five tasks in
# usertesting/docs/script_b_power.md (the SMS path).
#
# ⚠ Script B is RETIRED for paid UserTesting rounds — see the banner in
# script_b_power.md. This wrapper exists for developer convenience when
# verifying the SMS dispatch path manually before any future round
# revives the script.
#
# Usage:
#   ./testing/run_script_b.sh                        # all five Script B tests
#   ./testing/run_script_b.sh --grep "Task 2"        # one task; args pass through
#
# See testing/playwright/USER_TESTING_SCRIPTS.md for per-task pre-flight
# reminders (Gemini key, SMS provider pre-selection, Textbelt rate limit).

echo "============================================================"
echo "  SCRIPT B — SMS path (RETIRED for paid rounds)"
echo "============================================================"
echo "  Mirrors usertesting/docs/script_b_power.md. Manual SMS-receipt"
echo "  verification on the tester's phone is still required — this"
echo "  spec only confirms the add-on dispatch path runs to completion."
echo ""
echo "  Per-task pre-flight (set in testing/playwright/e2e.config.env):"
echo "    T2    GEMINI_API_KEY"
echo "    T2    SMS_PROVIDER, SMS_API_KEY, SMS_TEST_NUMBER"
echo "          (provider must already be picked in Settings on the test"
echo "          account — the dropdown is a Material control Playwright"
echo "          cannot reliably change. Country code on the test number"
echo "          must also be pre-set.)"
echo "    T4    GOOGLE_EMAIL"
echo ""
echo "  Textbelt's free 'textbelt' token is rate-limited to 1 SMS / 24h."
echo "  Re-running T2 within that window will hit the rate limit (the"
echo "  assertion accepts that wording as a pass)."
echo "============================================================"
echo ""

exec "$(dirname "$0")/run_free_e2e_tests.sh" tests/script_b.spec.js "$@"
