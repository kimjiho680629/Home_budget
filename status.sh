#!/usr/bin/env bash
# ========================================================
# 우리집 가계부 (Home Budget) 상태 확인 스크립트
# ========================================================

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR" || exit 1

if [ -f "$BASE_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$BASE_DIR/.env.local"
  set +a
fi

LOCAL_IP=""
if command -v ip >/dev/null 2>&1; then
  LOCAL_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -n 1)
elif command -v hostname >/dev/null 2>&1; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

echo "=========================================="
echo "📊 우리집 가계부 현재 동작 상태"
echo "=========================================="

# 1. 서버 상태 (3000번 포트 리스닝 또는 next-server 확인)
if (command -v ss >/dev/null 2>&1 && ss -tln 2>/dev/null | grep -q ':3000 ') || pgrep -f "next-server" > /dev/null; then
  echo "✓ 가계부 서버: 정상 실행 중 (http://localhost:3000)"
  if [ -n "$LOCAL_IP" ]; then
    echo "🏠 집 안 와이파이 주소: http://${LOCAL_IP}:3000"
  fi
else
  echo "✗ 가계부 서버: 중지됨"
fi

# 2. 터널 상태
if pgrep -f "cloudflared tunnel" > /dev/null; then
  echo "✓ Cloudflare 터널: 정상 실행 중"
  ACTIVE_URL="${PUBLIC_URL:-}"
  if [ -z "$ACTIVE_URL" ] && [ -f "$BASE_DIR/CURRENT_URL.txt" ]; then
    ACTIVE_URL=$(cat "$BASE_DIR/CURRENT_URL.txt")
  fi
  if [ -n "$ACTIVE_URL" ]; then
    echo "📱 외부 접속 주소: $ACTIVE_URL"
    echo ""
    echo "📷 QR 코드 스캔 접속:"
    node "$BASE_DIR/scripts/print-qr.mjs" "$ACTIVE_URL" 2>/dev/null || true
  fi
else
  echo "✗ Cloudflare 터널: 중지됨"
fi
echo "=========================================="
