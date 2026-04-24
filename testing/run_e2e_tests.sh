#!/usr/bin/env bash
# emAIl Sentinel E2E test launcher.
#
# Usage:
#   ./testing/run_e2e_tests.sh                 # full suite
#   ./testing/run_e2e_tests.sh --grep "S7"     # any args pass through to Playwright
#   TEST_TIER=pro ./testing/run_e2e_tests.sh --grep "S21"
#
# What it does:
#   1. If Chrome is not already on port 9222, launches it with the E2E profile.
#   2. Waits for Gmail to finish loading.
#   3. Runs the Playwright suite (Playwright connects over CDP — no bot detection).
#   4. Produces an annotated plan copy under
#      testing/test_runs/<YYYY-MM-DD> <HH:MM:SS>_e2e_test_run.md.
#
# Leave the Chrome window alone while tests run.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAYWRIGHT_DIR="$SCRIPT_DIR/playwright"
RESULTS_JSON="$SCRIPT_DIR/.last_run_results.json"
ARCHIVE_SCRIPT="$SCRIPT_DIR/archive_run.js"
ENV_FILE="$PLAYWRIGHT_DIR/e2e.config.env"
CDP_PORT=9222

# ── Preflight checks ────────────────────────────────────────────────────────

if [ ! -d "$PLAYWRIGHT_DIR" ]; then
  echo "ERROR: playwright directory not found at $PLAYWRIGHT_DIR" >&2; exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Fill in CHROME_PROFILE_PATH, GOOGLE_EMAIL, GEMINI_API_KEY." >&2; exit 1
fi

# Pull GOOGLE_EMAIL for the first-run sign-in prompt. Sourcing the env file
# would break on unquoted values containing spaces, so parse with grep.
read_env() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'; }
GOOGLE_EMAIL="$(read_env GOOGLE_EMAIL)"

# ── Launch Chrome if not already on the debug port ──────────────────────────

if ! curl -sf "http://localhost:$CDP_PORT/json/version" > /dev/null 2>&1; then
  # Use a dedicated user-data-dir so Chrome's SingletonLock does not collide
  # with the user's daily Chrome (which owns ~/.config/google-chrome).
  E2E_USER_DATA_DIR="$HOME/.cache/email_sentinel_e2e_chrome"
  mkdir -p "$E2E_USER_DATA_DIR"

  FIRST_RUN=false
  [ ! -d "$E2E_USER_DATA_DIR/Default" ] && FIRST_RUN=true

  # Clear saved session so Chrome does not restore the previous window state
  # (fullscreen, specific tabs, "restore tabs?" bubble).
  for f in "Current Session" "Current Tabs" "Last Session" "Last Tabs"; do
    rm -f "$E2E_USER_DATA_DIR/Default/$f"
  done

  # Strip browser.window_placement from Preferences so --window-size wins.
  PREFS="$E2E_USER_DATA_DIR/Default/Preferences"
  if [ -f "$PREFS" ] && command -v python3 > /dev/null 2>&1; then
    python3 - <<EOF 2>/dev/null || true
import json
p = "$PREFS"
try:
    with open(p) as f: d = json.load(f)
    d.get("browser", {}).pop("window_placement", None)
    with open(p, "w") as f: json.dump(d, f)
except Exception: pass
EOF
  fi

  # On first run, land on the Google sign-in form directly so the user can
  # authenticate without fighting Gmail's marketing redirect. On subsequent
  # runs (cookies already persisted), go straight to the inbox.
  if $FIRST_RUN; then
    START_URL="https://accounts.google.com/ServiceLogin?service=mail&continue=https://mail.google.com/mail/"
  else
    START_URL="https://mail.google.com"
  fi

  # Detect the primary monitor's height so Chrome can open as tall as the screen.
  SCREEN_HEIGHT=""
  if command -v xrandr > /dev/null 2>&1; then
    SCREEN_HEIGHT=$(xrandr 2>/dev/null | awk '/\*/ {print $1; exit}' | cut -d'x' -f2)
  fi
  if [ -z "$SCREEN_HEIGHT" ] && command -v xdpyinfo > /dev/null 2>&1; then
    SCREEN_HEIGHT=$(xdpyinfo 2>/dev/null | awk '/dimensions:/ {print $2}' | cut -d'x' -f2)
  fi
  SCREEN_HEIGHT=${SCREEN_HEIGHT:-1080}
  WINDOW_HEIGHT=$(( SCREEN_HEIGHT - 60 ))   # leave ~60px for OS taskbar / top bar

  echo "Starting Chrome (port $CDP_PORT, user-data-dir=$E2E_USER_DATA_DIR)..."
  echo "  Window: 1024×${WINDOW_HEIGHT}"
  google-chrome \
    --remote-debugging-port=$CDP_PORT \
    --user-data-dir="$E2E_USER_DATA_DIR" \
    --window-size=1024,${WINDOW_HEIGHT} \
    --window-position=100,0 \
    --no-first-run \
    --no-default-browser-check \
    --disable-restore-session-state \
    --hide-crash-restore-bubble \
    "$START_URL" \
    > /dev/null 2>&1 &
  CHROME_PID=$!

  echo "  Waiting for Chrome to be ready..."
  for i in $(seq 1 30); do
    sleep 1
    if curl -sf "http://localhost:$CDP_PORT/json/version" > /dev/null 2>&1; then
      echo "  Chrome ready."
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "ERROR: Chrome did not respond on port $CDP_PORT after 30 seconds." >&2
      kill "$CHROME_PID" 2>/dev/null || true
      exit 1
    fi
  done

  if $FIRST_RUN; then
    echo ""
    echo "============================================================"
    echo "  FIRST RUN — one-time manual sign-in required"
    echo "============================================================"
    echo "A fresh Chrome window just opened against a dedicated E2E"
    echo "profile (separate from your daily Chrome, no conflicts)."
    echo ""
    echo "  1. Sign in to Gmail with ${GOOGLE_EMAIL:-the test account}."
    echo "  2. Wait until the inbox fully loads."
    echo "  3. Press Enter here to start the test suite."
    echo ""
    echo "The profile will persist — future runs skip this step."
    echo "============================================================"
    read -r _
  else
    echo "  Waiting for Gmail to load..."
    sleep 6
  fi
  echo ""
else
  echo "Chrome already running on port $CDP_PORT — reusing."
  echo ""
fi

# ── Install Playwright deps (idempotent) ────────────────────────────────────

cd "$PLAYWRIGHT_DIR"
if [ ! -d node_modules ]; then
  echo "Installing Playwright dependencies (one-time)..."
  npm install
fi

# ── Run the suite ────────────────────────────────────────────────────────────

rm -f "$RESULTS_JSON"
export PLAYWRIGHT_JSON_OUTPUT_NAME="$RESULTS_JSON"
export PLAYWRIGHT_HTML_OPEN="${PLAYWRIGHT_HTML_OPEN:-never}"
export PW_TEST_HTML_REPORT_OPEN="${PW_TEST_HTML_REPORT_OPEN:-never}"

echo "Launching Playwright suite..."
echo "  cwd:       $PLAYWRIGHT_DIR"
echo "  TEST_TIER: ${TEST_TIER:-free (default)}"
echo ""

npx playwright test "$@"
EXIT_CODE=$?

echo ""
echo "Playwright finished with exit code $EXIT_CODE"

# ── Produce annotated run report ─────────────────────────────────────────────

if [ -f "$RESULTS_JSON" ] && [ -f "$ARCHIVE_SCRIPT" ]; then
  echo ""
  echo "Generating annotated run report..."
  node "$ARCHIVE_SCRIPT"
else
  echo "WARNING: skipped archive step — results JSON or archive script missing." >&2
fi

exit $EXIT_CODE
