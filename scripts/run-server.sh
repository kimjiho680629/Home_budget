#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

if [ -f "$BASE_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$BASE_DIR/.env.local"
  set +a
fi

if [ ! -f "$BASE_DIR/.next/BUILD_ID" ]; then
  npm run build
fi

# AC 전원 연결 시 유휴 잠자기를 방지(-s)하면서 포그라운드 실행 (launchd 관리용)
if [ -x /usr/bin/caffeinate ]; then
  exec /usr/bin/caffeinate -s "$BASE_DIR/node_modules/.bin/next" start -p 3000
else
  exec "$BASE_DIR/node_modules/.bin/next" start -p 3000
fi
