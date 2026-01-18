#!/usr/bin/env bash
set -euo pipefail

# Run GitHub Actions jobs locally using act, from an isolated temp workspace.
# This avoids act/checkout touching your real working tree.
#
# Usage:
#   ./scripts/act-local.sh <job>
#   ./scripts/act-local.sh <job> -- <act extra args>
#
# Examples:
#   ./scripts/act-local.sh frontend
#   ./scripts/act-local.sh gateway
#   ./scripts/act-local.sh integration -- -W .github/workflows/ci.yml

job=${1:-}
if [[ -z "${job}" ]]; then
  echo "Usage: $0 <job> [-- <act extra args>]" >&2
  exit 2
fi
shift || true

extra_args=()
if [[ ${1:-} == "--" ]]; then
  shift
  extra_args=("$@")
fi

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
workspace_base=${ACT_WORKSPACE_BASE:-/tmp}
workspace=$(mktemp -d "${workspace_base%/}/act-workspace.XXXXXX")

if [[ "${KEEP_ACT_WORKSPACE:-}" != "1" ]]; then
  trap 'rm -rf "$workspace"' EXIT
else
  echo "KEEP_ACT_WORKSPACE=1 set; keeping workspace at: $workspace" >&2
fi

# Portable copy without rsync. We exclude .git and common build artifacts.
# (act doesn't need .git for most jobs, and excluding it avoids slow copies.)
(
  cd "$repo_root"
  tar \
    --exclude='./.git' \
    --exclude='./**/node_modules' \
    --exclude='./frontend/dist' \
    --exclude='./frontend/.astro' \
    --exclude='./target' \
    --exclude='./backend/target' \
    --exclude='./gateway/target' \
    -cf - .
) | (cd "$workspace" && tar -xf -)

# Make the workspace a real (throwaway) git repo so act can determine ref/revision.
(
  cd "$workspace"
  git init -q
  git config user.email "act-local@example.invalid"
  git config user.name "act-local"
  git add -A
  # Avoid failing if there are no changes (shouldn't happen on a fresh copy, but keep it robust).
  git commit -qm "act local snapshot" || true
)

cd "$workspace"
act -j "$job" "${extra_args[@]}"
