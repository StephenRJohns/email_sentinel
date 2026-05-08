#!/usr/bin/env bash
#
# walk_test_run.sh — Interactive walk-through of the latest archived
# Playwright run for manual checklist items still marked `- [ ]`.
#
# Workflow:
#   1. Look in testing/test_runs/ for the latest file matching
#      <YYYY-MM-DD>_<HH:MM:SS>_e2e_test_run.md (most recent by filename
#      sort, regardless of date).
#   2. If no archived run exists at all, print a message and offer to
#      launch run_free_e2e_tests.sh or run_pro_e2e_tests.sh. After the
#      suite finishes, re-run this script to walk the new archive.
#   3. Otherwise, walk every `- [ ]` line in section order and prompt
#      for p / f / s / q.
#   4. Edit the file in place after each answer, so Ctrl+C never loses
#      progress past the last answered item.
#
# Answer key:
#   p  pass            replaces `- [ ]` with `- [✅]`
#   f  fail            replaces with `- [❌]` and prompts for a one-line
#                      error description; the description is inserted
#                      on the next line as
#                      `<span style="color:darkred">DESC</span>`
#   s  skip            leaves `- [ ]` untouched (e.g. for [Optional]
#                      items you did not run, or items to come back to)
#   q  quit            exits early; everything answered so far is saved
#
# Run from the repo root or anywhere — paths are resolved relative to
# this script's location:
#   bash testing/walk_test_run.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNS_DIR="$SCRIPT_DIR/test_runs"
FREE_RUN="$SCRIPT_DIR/run_free_e2e_tests.sh"
PRO_RUN="$SCRIPT_DIR/run_pro_e2e_tests.sh"

CHECKBOX_RE='^([[:space:]]*)-[[:space:]]\[[[:space:]]\][[:space:]](.*)$'
SECTION_RE='^## ([0-9]+[a-z]?) · (.*)$'

find_latest_run() {
  [[ ! -d "$RUNS_DIR" ]] && { echo ""; return; }
  local file
  file=$(ls "$RUNS_DIR" 2>/dev/null \
    | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}:[0-9]{2}:[0-9]{2}_e2e_test_run\.md$' \
    | sort | tail -1) || true
  [[ -n "$file" ]] && echo "$RUNS_DIR/$file" || echo ""
}

count_unchecked() {
  grep -c '^[[:space:]]*- \[ \] ' "$1" 2>/dev/null || true
}

replace_line() {
  local file="$1" lineno="$2" newline="$3"
  awk -v n="$lineno" -v r="$newline" \
    'NR==n{print r; next} {print}' "$file" > "${file}.tmp" \
    && mv "${file}.tmp" "$file"
}

insert_after() {
  local file="$1" lineno="$2" insert="$3"
  awk -v n="$lineno" -v ins="$insert" \
    'NR==n{print; print ins; next} {print}' "$file" > "${file}.tmp" \
    && mv "${file}.tmp" "$file"
}

offer_suite_and_exit() {
  echo ""
  echo "No archived test runs found in $RUNS_DIR."
  echo ""
  echo "Run the Playwright suite now?"
  echo "  [f]ree  — run_free_e2e_tests.sh"
  echo "  [p]ro   — run_pro_e2e_tests.sh (requires setTierPro in Apps Script first)"
  echo "  [n]o    — exit without running"
  local ans cmd=""
  read -rp "Choice: " ans
  case "${ans,,}" in
    f|free) cmd="$FREE_RUN" ;;
    p|pro)  cmd="$PRO_RUN" ;;
    *)      echo "Aborting."; return ;;
  esac
  if [[ ! -f "$cmd" ]]; then
    echo "ERROR: $cmd not found." >&2
    exit 2
  fi
  echo ""
  echo "Launching $(basename "$cmd") ..."
  echo ""
  bash "$cmd" || true
  echo ""
  echo "Done. Re-run 'bash testing/walk_test_run.sh' to walk the new archive interactively."
}

walk() {
  local filepath="$1"
  local total
  total=$(count_unchecked "$filepath")

  if [[ "$total" -eq 0 ]]; then
    echo "No unchecked '- [ ]' items remaining in this archive — nothing to walk."
    return
  fi

  local relpath
  relpath=$(realpath --relative-to="$(pwd)" "$filepath")
  echo "Walking $relpath"
  echo "$total unchecked item(s). Answer p(ass) / f(ail) / s(kip) / q(uit) for each."
  echo ""

  local last_section="" skip_section="" answered=0 lineno=0

  while true; do
    mapfile -t lines < "$filepath"
    local nlines=${#lines[@]}

    local found=0 i indent="" text=""
    for (( i=lineno; i<nlines; i++ )); do
      if [[ "${lines[$i]}" =~ $CHECKBOX_RE ]]; then
        found=1
        lineno=$i
        indent="${BASH_REMATCH[1]}"
        text="${BASH_REMATCH[2]}"
        break
      fi
    done
    [[ $found -eq 0 ]] && break

    local current_section=""
    for (( j=lineno; j>=0; j-- )); do
      if [[ "${lines[$j]}" =~ $SECTION_RE ]]; then
        current_section="## ${BASH_REMATCH[1]} · ${BASH_REMATCH[2]}"
        break
      fi
    done

    if [[ -n "$current_section" && "$current_section" != "$last_section" ]]; then
      skip_section=""   # entering a new section; reset section-skip
      echo ""
      echo "$current_section"
      local sep_len=$(( ${#current_section} < 78 ? ${#current_section} : 78 ))
      printf '%*s\n' "$sep_len" '' | tr ' ' '-'
      last_section="$current_section"
    fi

    # Auto-skip the rest of a section after the user skipped one item in it
    if [[ -n "$skip_section" && "$skip_section" == "$current_section" ]]; then
      echo ""
      echo "  $text"
      echo "  → skipped"
      answered=$(( answered + 1 ))
      lineno=$(( lineno + 1 ))
      continue
    fi

    echo ""
    echo "  $text"

    local ans=""
    while true; do
      read -rp "  [$((answered + 1))/$total] → p/f/s/q: " ans
      ans="${ans,,}"
      [[ "$ans" == p || "$ans" == f || "$ans" == s || "$ans" == q ]] && break
      echo "  please answer p, f, s, or q"
    done
    [[ "$ans" == q ]] && break

    local sed_lineno=$(( lineno + 1 ))

    case "$ans" in
      s)
        skip_section="$current_section"   # skip the rest of this section
        answered=$(( answered + 1 ))
        lineno=$(( lineno + 1 ))
        ;;
      p)
        replace_line "$filepath" "$sed_lineno" "${indent}- [✅] ${text}"
        answered=$(( answered + 1 ))
        lineno=$(( lineno + 1 ))
        ;;
      f)
        local desc=""
        read -rp "  Error (one line, blank to skip): " desc || true
        replace_line "$filepath" "$sed_lineno" "${indent}- [❌] ${text}"
        if [[ -n "$desc" ]]; then
          insert_after "$filepath" "$sed_lineno" \
            "${indent}  <span style=\"color:darkred\">${desc}</span>"
          lineno=$(( lineno + 2 ))
        else
          lineno=$(( lineno + 1 ))
        fi
        answered=$(( answered + 1 ))
        ;;
    esac
  done

  echo ""
  echo "Answered $answered/$total. Saved to $relpath."
}

main() {
  local latest
  latest=$(find_latest_run)
  if [[ -z "$latest" ]]; then
    offer_suite_and_exit
    return
  fi
  walk "$latest"
}

main
