#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

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

if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  if [ -n "${PUBLIC_URL:-}" ]; then
    echo "$PUBLIC_URL" > "$BASE_DIR/CURRENT_URL.txt"
  fi
  exec "$CLOUDFLARED" tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN"
fi

# Quick Tunnel 실행: 발급되는 trycloudflare.com URL을 CURRENT_URL.txt에 즉시 기록
"$CLOUDFLARED" tunnel --url http://localhost:3000 > >(
  while IFS= read -r line; do
    printf '%s\n' "$line"
    if [[ "$line" =~ (https://[-a-zA-Z0-9]+\.trycloudflare\.com) ]]; then
      printf '%s\n' "${BASH_REMATCH[1]}" > "$BASE_DIR/CURRENT_URL.txt"
    fi
  done
) 2>&1 &
TUNNEL_PID=$!

trap 'kill -TERM "$TUNNEL_PID" 2>/dev/null || true; wait "$TUNNEL_PID" 2>/dev/null || true' TERM INT
wait "$TUNNEL_PID"
