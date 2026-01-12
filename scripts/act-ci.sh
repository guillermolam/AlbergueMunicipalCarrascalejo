#!/bin/bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v act >/dev/null 2>&1; then
  echo "act is not installed. Install it from https://github.com/nektos/act and retry." >&2
  exit 1
fi

JOB="${ACT_JOB:-}"
WORKFLOW="${ACT_WORKFLOW:-.github/workflows/ci.yml}"

RUNNER_IMAGE="${ACT_RUNNER_IMAGE:-ghcr.io/catthehacker/ubuntu:act-22.04}"

ARGS=("-W" "$WORKFLOW" "-P" "ubuntu-latest=$RUNNER_IMAGE")

if [[ -n "$JOB" ]]; then
  ARGS+=("-j" "$JOB")
fi

exec act "${ARGS[@]}"
