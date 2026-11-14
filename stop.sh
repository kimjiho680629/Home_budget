#!/usr/bin/env bash
# ========================================================
# 우리집 가계부 (Home Budget) 중지 스크립트
# ========================================================

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$BASE_DIR/logs"

echo "가계부 서버 및 Cloudflare 터널을 종료합니다..."

# macOS LaunchAgent가 로드된 경우 KeepAlive 재시작을 막기 위해 함께 언로드
if command -v launchctl >/dev/null 2>&1; then
  for plist in \
    "$HOME/Library/LaunchAgents/com.kimjiho.home-budget-tunnel.plist" \
    "$HOME/Library/LaunchAgents/com.kimjiho.home-budget-server.plist"; do
    if [ -f "$plist" ]; then
      launchctl unload "$plist" 2>/dev/null || true
    fi
  done
fi

STOPPED_SERVER=0
if [ -f "$LOG_DIR/server.pid" ]; then
  kill "$(cat "$LOG_DIR/server.pid")" 2>/dev/null && STOPPED_SERVER=1
  rm -f "$LOG_DIR/server.pid"
fi
pkill -f "next start -p 3000" 2>/dev/null && STOPPED_SERVER=1
pkill -f "next-server" 2>/dev/null && STOPPED_SERVER=1
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp >/dev/null 2>&1 && STOPPED_SERVER=1
fi

if [ "$STOPPED_SERVER" -eq 1 ]; then
  echo "✓ 가계부 서버 종료 완료"
else
  echo "- 가계부 서버가 실행 중이 아닙니다."
fi

STOPPED_TUNNEL=0
if [ -f "$LOG_DIR/tunnel.pid" ]; then
  kill "$(cat "$LOG_DIR/tunnel.pid")" 2>/dev/null && STOPPED_TUNNEL=1
  rm -f "$LOG_DIR/tunnel.pid"
fi
pkill -f "cloudflared tunnel" 2>/dev/null && STOPPED_TUNNEL=1

if [ "$STOPPED_TUNNEL" -eq 1 ]; then
  echo "✓ Cloudflare 터널 종료 완료"
else
  echo "- Cloudflare 터널이 실행 중이 아닙니다."
fi

echo "모든 서비스가 중지되었습니다."
