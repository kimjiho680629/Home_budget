#!/usr/bin/env bash
# ========================================================
# 우리집 가계부 (Home Budget) 실행 스크립트
# ========================================================

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOUDFLARED="$(command -v cloudflared || echo "$HOME/.local/bin/cloudflared")"
LOG_DIR="$BASE_DIR/logs"
SERVER_PID_FILE="$LOG_DIR/server.pid"
TUNNEL_PID_FILE="$LOG_DIR/tunnel.pid"

mkdir -p "$LOG_DIR"
cd "$BASE_DIR" || exit 1

# 아직 빌드되지 않은 새 환경이면 자동 빌드 실행
if [ ! -f "$BASE_DIR/.next/BUILD_ID" ]; then
  echo "📦 프로덕션 빌드가 없어 초기 빌드를 실행합니다..."
  npm run build || exit 1
fi

# .env.local 설정 로드 (고정 터널 토큰 / 고정 주소 등)
if [ -f "$BASE_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$BASE_DIR/.env.local"
  set +a
fi

echo "=========================================="
echo "🏠 우리집 가계부 서비스를 시작합니다..."
echo "=========================================="

# 1. 기존 프로세스 및 3000번 포트 점유 프로세스 확실히 종료
if [ -f "$SERVER_PID_FILE" ]; then
  kill "$(cat "$SERVER_PID_FILE")" 2>/dev/null || true
  rm -f "$SERVER_PID_FILE"
fi
if [ -f "$TUNNEL_PID_FILE" ]; then
  kill "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null || true
  rm -f "$TUNNEL_PID_FILE"
fi

pkill -f "next start -p 3000" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp >/dev/null 2>&1 || true
fi
pkill -f "cloudflared tunnel" 2>/dev/null || true

# 3000번 포트가 비워질 때까지 최대 5초 대기
if command -v ss >/dev/null 2>&1; then
  for i in {1..10}; do
    if ! ss -tln 2>/dev/null | grep -q ':3000 '; then
      break
    fi
    sleep 0.5
  done
else
  sleep 1
fi

# 2. Next.js 가계부 웹 서버 시작
echo "1. 가계부 웹 서버 구동 중..."
nohup ./node_modules/.bin/next start -p 3000 > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$SERVER_PID_FILE"
echo "   -> 서버 PID: $SERVER_PID (로컬: http://localhost:3000)"

# 3. 로컬 서버 준비 대기
SERVER_READY=0
for i in {1..20}; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "   ❌ 가계부 서버 시작 실패! 로그를 확인하세요: $LOG_DIR/server.log"
    cat "$LOG_DIR/server.log"
    exit 1
  fi
  if curl -s http://localhost:3000/api/users >/dev/null 2>&1; then
    echo "   -> 가계부 서버 정상 준비 완료!"
    SERVER_READY=1
    break
  fi
  sleep 0.5
done

if [ "$SERVER_READY" -eq 0 ]; then
  echo "   ⚠️ 서버 응답 대기 시간 초과 ($LOG_DIR/server.log 확인)"
fi

# 같은 집 와이파이용 내부 IP 확인 (Linux / macOS 호환)
LOCAL_IP=""
if command -v ip >/dev/null 2>&1; then
  LOCAL_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -n 1)
elif command -v ipconfig >/dev/null 2>&1; then
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
fi
if [ -z "$LOCAL_IP" ] && command -v hostname >/dev/null 2>&1; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
fi

LOCAL_URL=""
if [ -n "$LOCAL_IP" ]; then
  LOCAL_URL="http://${LOCAL_IP}:3000"
fi

# 4. Cloudflare 터널 시작 (cloudflared 설치 시)
TUNNEL_URL=""
if [ -x "$CLOUDFLARED" ]; then
  if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
    echo "2. Cloudflare 고정 터널 연결 중..."
    nohup "$CLOUDFLARED" tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN" > "$LOG_DIR/tunnel.log" 2>&1 &
    TUNNEL_PID=$!
    echo "$TUNNEL_PID" > "$TUNNEL_PID_FILE"
    echo "   -> 고정 터널 PID: $TUNNEL_PID"
    sleep 2
    TUNNEL_URL="${PUBLIC_URL:-}"
  else
    echo "2. Cloudflare 외부 접속 보안 터널 연결 중..."
    nohup "$CLOUDFLARED" tunnel --url http://localhost:3000 > "$LOG_DIR/tunnel.log" 2>&1 &
    TUNNEL_PID=$!
    echo "$TUNNEL_PID" > "$TUNNEL_PID_FILE"
    echo "   -> 터널 PID: $TUNNEL_PID"

    echo "3. 외부 접속 주소 발급 대기 중..."
    for i in {1..15}; do
      sleep 2
      TUNNEL_URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' "$LOG_DIR/tunnel.log" | tail -n 1)
      if [ -n "$TUNNEL_URL" ]; then
        break
      fi
    done
  fi
else
  echo "2. cloudflared가 설치되어 있지 않아 로컬/와이파이 모드로만 실행합니다."
  echo "   (외부 접속까지 쓰려면 README.md의 cloudflared 설치 안내를 참고하세요.)"
fi

echo ""
echo "=========================================="
if [ -n "$TUNNEL_URL" ]; then
  echo "$TUNNEL_URL" > "$BASE_DIR/CURRENT_URL.txt"
  echo "🎉 가계부 서비스가 성공적으로 시작되었습니다!"
  echo ""
  echo "📱 외부 접속 주소 (LTE/5G/외부 어디서나):"
  echo "👉 $TUNNEL_URL"
  if [ -n "$LOCAL_URL" ]; then
    echo ""
    echo "🏠 집 안 와이파이용 짧은 주소 (항상 고정):"
    echo "👉 $LOCAL_URL"
  fi
  echo ""
  echo "📷 스마트폰 카메라로 아래 QR 코드를 스캔하면 바로 열립니다:"
  node "$BASE_DIR/scripts/print-qr.mjs" "$TUNNEL_URL" 2>/dev/null || true
  echo "팁: 스마트폰에서 연 뒤 [홈 화면에 추가]를 누르면 앱처럼 바로 실행됩니다."
else
  echo "🏠 로컬/집 안 와이파이 주소로 실행되었습니다."
  echo "👉 http://localhost:3000"
  if [ -n "$LOCAL_URL" ]; then
    echo "👉 $LOCAL_URL"
    echo ""
    echo "📷 같은 와이파이 QR 코드 스캔 접속:"
    node "$BASE_DIR/scripts/print-qr.mjs" "$LOCAL_URL" 2>/dev/null || true
  fi
fi
echo "=========================================="
