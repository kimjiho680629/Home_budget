#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

# 5MB 초과 로그는 시작 시 1세대 백업으로 순환
LOG_FILE="$BASE_DIR/logs/launchd-tunnel.log"
if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE")" -gt 5242880 ]; then
  mv -f "$LOG_FILE" "${LOG_FILE}.1"
fi

CLOUDFLARED="$(command -v cloudflared || echo "/opt/homebrew/bin/cloudflared")"
if [ ! -x "$CLOUDFLARED" ]; then
  echo "cloudflared를 찾을 수 없습니다." >&2
  exit 1
fi

if [ -f "$BASE_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$BASE_DIR/.env.local"
  set +a
fi

send_telegram_url() {
  local new_url="$1"
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "text=🏠 우리집 가계부 새 외부 접속 주소: ${new_url}" >/dev/null 2>&1 || true
  fi
}

if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  if [ -n "${PUBLIC_URL:-}" ]; then
    echo "$PUBLIC_URL" > "$BASE_DIR/CURRENT_URL.txt"
  fi
  exec "$CLOUDFLARED" tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN"
fi

# Quick Tunnel 실행: 발급되는 trycloudflare.com URL을 CURRENT_URL.txt에 기록하고 선택 시 알림 전송
"$CLOUDFLARED" tunnel --url http://localhost:3000 > >(
  while IFS= read -r line; do
    printf '%s\n' "$line"
    if [[ "$line" =~ (https://[-a-zA-Z0-9]+\.trycloudflare\.com) ]]; then
      ISSUED_URL="${BASH_REMATCH[1]}"
      printf '%s\n' "$ISSUED_URL" > "$BASE_DIR/CURRENT_URL.txt"
      send_telegram_url "$ISSUED_URL"
    fi
  done
) 2>&1 &
TUNNEL_PID=$!

trap 'kill -TERM "$TUNNEL_PID" 2>/dev/null || true; wait "$TUNNEL_PID" 2>/dev/null || true' TERM INT
wait "$TUNNEL_PID"
