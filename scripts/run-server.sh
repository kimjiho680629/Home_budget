#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

# 5MB 초과 로그는 시작 시 1세대 백업으로 순환
LOG_FILE="$BASE_DIR/logs/launchd-server.log"
if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE")" -gt 5242880 ]; then
  mv -f "$LOG_FILE" "${LOG_FILE}.1"
fi

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
