#!/usr/bin/env bash
# Clean-slate reset of the E2E Chrome environment.
#
# Kills every Chrome process tied to the dedicated E2E user-data-dir and
# deletes the dir itself, so the next launcher run starts fresh:
# no zombie processes, no corrupted session files, no stale cookies.
#
# Use this when:
#   - Chrome keeps refreshing or crashing during the first-run sign-in.
#   - The launcher reports "Chrome did not respond on port 9222".
#   - You want to re-authenticate with a different Google account.
#   - The E2E profile is behaving strangely in any way.
#
# This is safe to run any time — it only touches the E2E dir and processes
# that reference it. Your daily Chrome and its profiles are untouched.

set -uo pipefail

E2E_USER_DATA_DIR="$HOME/.cache/email_sentinel_e2e_chrome"

echo "Resetting E2E Chrome environment..."

# Kill every Chrome process that references the E2E user-data-dir.
if pgrep -f "email_sentinel_e2e_chrome" > /dev/null 2>&1; then
  echo "  Killing E2E Chrome processes..."
  pkill -9 -f "email_sentinel_e2e_chrome" 2>/dev/null || true
  sleep 2
else
  echo "  No E2E Chrome processes running."
fi

# Remove the dedicated E2E profile directory.
if [ -d "$E2E_USER_DATA_DIR" ]; then
  echo "  Removing $E2E_USER_DATA_DIR..."
  rm -rf "$E2E_USER_DATA_DIR"
else
  echo "  $E2E_USER_DATA_DIR does not exist — nothing to delete."
fi

echo "Done. The next ./run_free_e2e_tests.sh (or run_pro_e2e_tests.sh) run will be treated as a first run."
