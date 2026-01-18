#!/usr/bin/env bash
set -euo pipefail

if [ -d "/home/linuxbrew/.linuxbrew/bin" ]; then
  export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"
fi

if command -v pnpm >/dev/null 2>&1; then
  exec pnpm "$@"
fi

if [ -x "${HOME}/.local/share/pnpm/pnpm" ]; then
  exec "${HOME}/.local/share/pnpm/pnpm" "$@"
fi

if [ -x "/home/linuxbrew/.linuxbrew/bin/pnpm" ]; then
  exec "/home/linuxbrew/.linuxbrew/bin/pnpm" "$@"
fi

echo "pnpm not found in PATH" >&2
exit 127