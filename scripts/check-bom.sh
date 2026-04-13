#!/usr/bin/env bash
# Fail if any tracked source file starts with a UTF-8 BOM (EF BB BF).
# Astro tolerates BOMs but Wuchale's acorn-typescript parser does not, and
# a BOM wasted ~30 min of debugging during the i18n rollout. Enforce it.
#
# Usage:
#   scripts/check-bom.sh                 # scan all staged files (pre-commit mode)
#   scripts/check-bom.sh --all           # scan the entire working tree (CI mode)
#
# Written POSIX-style so it works with macOS' bash 3.2 (no `mapfile`).
set -eu

mode="${1:-staged}"

bom="$(printf '\357\273\277')"
bad_count=0
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

if [ "$mode" = "--all" ]; then
  git ls-files > "$tmp"
else
  git diff --cached --name-only --diff-filter=ACMR > "$tmp"
fi

while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ ! -f "$f" ] && continue
  first3="$(head -c 3 "$f" 2>/dev/null || true)"
  if [ "$first3" = "$bom" ]; then
    if [ "$bad_count" -eq 0 ]; then
      echo "error: UTF-8 BOM detected in the following files:" >&2
    fi
    echo "  $f" >&2
    bad_count=$((bad_count + 1))
  fi
done < "$tmp"

if [ "$bad_count" -gt 0 ]; then
  echo "" >&2
  echo "Strip it with:" >&2
  echo "  perl -i -pe 'BEGIN{undef \$/;} s/^\\x{EF}\\x{BB}\\x{BF}//' <file>" >&2
  exit 1
fi
