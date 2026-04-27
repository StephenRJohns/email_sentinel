#!/usr/bin/env bash
# Pro-tier wrapper around run_free_e2e_tests.sh.
#
# Sets TEST_TIER=pro so the S2 Pro polling tests and S21 Pro Plan Unlocks
# describe blocks run instead of skipping.
#
# Usage:
#   ./testing/run_pro_e2e_tests.sh                 # full Pro suite
#   ./testing/run_pro_e2e_tests.sh --grep "S21"    # one section; args pass through
#
# Before running, in the Apps Script editor (script.google.com):
#   1. Open LicenseManager.gs and run setTierPro to flip the add-on to Pro
#   2. Reload the add-on card in Gmail
# When done testing, run setTierFree in Apps Script to revert.

echo "============================================================"
echo "  PRO-TIER TEST RUN"
echo "============================================================"
echo "  Before continuing, in the Apps Script editor:"
echo "    1. Open LicenseManager.gs and run setTierPro"
echo "    2. Reload the add-on card in Gmail"
echo ""
echo "  When done, run setTierFree to revert."
echo "============================================================"
echo ""

export TEST_TIER=pro
exec "$(dirname "$0")/run_free_e2e_tests.sh" "$@"
