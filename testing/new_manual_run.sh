#!/usr/bin/env bash
# Create a fresh, blank test run file from the e2e_test_plan.md template.
# All checkboxes are left unchecked for manual completion.
#
# Usage:
#   ./testing/new_manual_run.sh
#
# Output:
#   testing/test_runs/<YYYY-MM-DD> <HH:MM:SS>_e2e_test_run.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAN="$SCRIPT_DIR/e2e_test_plan.md"
OUT_DIR="$SCRIPT_DIR/test_runs"

if [ ! -f "$PLAN" ]; then
  echo "ERROR: $PLAN not found." >&2; exit 1
fi

mkdir -p "$OUT_DIR"

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
OUTFILE="$OUT_DIR/${TIMESTAMP}_e2e_test_run.md"

cp "$PLAN" "$OUTFILE"

echo "Created: $OUTFILE"
