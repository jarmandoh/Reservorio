#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/backend"
if [ ! -f .env ]; then
  cp .env.example .env
fi
pnpm install
pnpm run dev &

cd "$ROOT_DIR/frontend"
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || true
fi
pnpm install
pnpm start
