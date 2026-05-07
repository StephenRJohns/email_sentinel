#!/bin/bash
dir="$(dirname "$0")"
mapfile -t files < <(ls -t "$dir"/*.md 2>/dev/null)
if [ ${#files[@]} -le 1 ]; then
  echo "Nothing to remove."
  exit 0
fi
remove=("${files[@]:1}")
echo "Removing ${#remove[@]} file(s):"
for f in "${remove[@]}"; do
  echo "  $f"
  rm "$f"
done
echo "Kept: ${files[0]}"
