#!/bin/bash
#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
pnpm install
pnpm run build
