# 🏠 우리집 가계부 (Home Budget) macOS 상시 서버 구축 및 운영 가이드

이 문서는 `kimjiho680629/Home_Budget` 프로젝트를 현재 macOS 시스템에 설치하고, **상시 서버·자동 실행·외부 접속(Cloudflare Tunnel)·로그인 비밀번호 보안**까지 구성한 전체 내역과 추후 유지보수/수정 절차를 정리한 운영 문서입니다.

---

## 1. 시스템 및 설치 환경 요약

- **프로젝트 경로**: `/Users/kimjiho/Gemini_Project/Home_Budget`
- **원본 저장소**: `https://github.com/kimjiho680629/Home_budget.git`
- **운영체제 / 기기**: `macOS 27.2.1` (`MacBookPro18,1`)
- **Node.js / npm**: `v22.18.0` (`/Users/kimjiho/.nvm/versions/node/v22.18.0/bin/node`) / `11.10.0`
- **Cloudflare Tunnel 클라이언트**: `cloudflared 2026.11.0` (`/opt/homebrew/bin/cloudflared`)
- **웹 서버 포트**: `3000` (`http://localhost:3000`)
- **데이터베이스**: `data/budget.db` (`node:sqlite`, WAL 모드, `.gitignore`로 Git 추적 제외)
- **일일 자동 백업**: `data/backups/budget_YYYY-MM-DD.db` (매일 03:30 `launchd` 자동 스냅샷, 최대 14개 보관)

---

## 2. 추가·수정된 파일 목록 (현재 커스터마이징 내역)

추후 코드를 수정하거나 GitHub에 반영할 때 참고할 수 있는 변경 파일 목록입니다.

### A. 로그인 비밀번호 인증 (앱 내 추가 기능)
| 파일 경로 | 역할 |
| :--- | :--- |
| `src/lib/auth.ts` | `scrypt` 솔트 해시 검증, `HMAC-SHA256` 서명 세션 쿠키(`home-budget-session`, 30일 유지, HTTPS 요청 시 `Secure` 자동 적용), 로그인 실패 5회 시 60초 잠금(Rate Limit) |
| `src/app/api/auth/route.ts` | `/api/auth` API (`GET` 인증상태 확인, `POST` 로그인·최초설정·로그아웃, `PATCH` 비밀번호 변경, `DELETE` 로그아웃) |
| `src/app/api/users/route.ts` | 모든 핸들러(`GET/POST/PUT/DELETE`)에 `requireAuth` 인증 검사 추가 |
| `src/app/api/categories/route.ts` | 모든 핸들러(`GET/POST/PUT/DELETE`)에 `requireAuth` 인증 검사 추가 |
| `src/app/api/summary/route.ts` | `GET` 핸들러에 `requireAuth` 인증 검사 추가 |
| `src/app/api/transactions/route.ts` | 모든 핸들러(`GET/POST/PUT/DELETE`)에 `requireAuth` 인증 검사 추가 |
| `src/app/api/connection/route.ts` | `GET` 핸들러에 `requireAuth` 인증 검사 추가 |
| `src/components/LoginScreen.tsx` | 로그인 화면 및 미설정 시 최초 비밀번호 설정 UI (다크모드 지원) |
| `src/components/SettingsView.tsx` | **로그인 비밀번호 · 잠금 설정** 패널 추가 (비밀번호 변경 및 로그아웃 버튼) |
| `src/app/page.tsx` | 초기 진입 시 `/api/auth` 확인, 미인증 시 `LoginScreen` 표시, API `401` 수신 시 자동 잠금, 사이드바 로그아웃 버튼 추가 |
| `scripts/set-password.mjs` | 터미널에서 비밀번호를 즉시 설정/초기화하는 CLI 스크립트 |
| `.env.local.example` | `CLOUDFLARE_TUNNEL_TOKEN`, `PUBLIC_URL`, 선택적 `APP_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` 예시 |

### B. 가계부 핵심 기능·버그 수정 및 확장 기능
| 파일 경로 | 역할 |
| :--- | :--- |
| `src/lib/date.ts` | 로컬 타임존 기준 날짜/월 계산(`getLocalDateStr`, `getLocalMonthStr`), 날짜 검증, 최근 6개월·호주 회계연도(`FY 7/1~6/30`) 유틸 |
| `src/lib/api-client.ts` | 전역 `apiFetch` 래퍼 (`401` 수신 시 `home-budget:unauthorized` 이벤트 발행하여 모든 하위 컴포넌트 자동 잠금) |
| `src/lib/db.ts` | `recurring_templates` 테이블 추가 등 SQLite 스키마 관리 |
| `src/types/budget.ts` | `MonthlyTrendPoint`, `RecurringTemplate` 등 공용 타입 정의 |
| `src/app/api/budgets/route.ts` | 월별 목표 예산 `GET/PUT` API |
| `src/app/api/templates/route.ts` | 고정 지출·정기 수입 템플릿 `GET/POST(생성·즉시반영)/DELETE` API |
| `src/app/api/export/route.ts` | Excel 호환 UTF-8 BOM CSV 내보내기 API (수식 인젝션 방어 포함) |
| `src/app/api/backup/route.ts` | WAL 안전 스냅샷(`VACUUM INTO`) SQLite DB 파일 즉시 다운로드 API |
| `src/app/api/summary/route.ts` | 월간 요약 + 최근 6개월 수입·지출·순수입 추이(`monthlyTrend`) + 월 형식 검증 |
| `src/app/api/transactions/route.ts` | 전체 월 검색(`allMonths`), 기간(`startDate/endDate`), 구분/결제수단 필터 및 `type`·`YYYY-MM-DD` 엄격 검증 |
| `src/components/DashboardView.tsx` | 월별 목표 예산 인라인 설정/진행률 바 및 정기 내역 일괄 반영 버튼 |
| `src/components/TransactionForm.tsx` | 호주 로컬 날짜(`getLocalDateStr()`) 버그 수정, 복제 등록(`duplicatingTx`), 정기 템플릿 칩 원클릭 채우기 및 템플릿 동시 저장 |
| `src/components/TransactionsView.tsx` | 결제수단 필터, 정렬(최신/과거/금액순), 전체 월 검색 토글, 거래 복제(`Copy`) 버튼 |
| `src/components/StatsView.tsx` | 최근 6개월 수입·지출 추이 막대 그래프 및 CSV 내보내기(당월/호주 회계연도/사용자 지정 기간) |
| `src/components/SettingsView.tsx` | `정기내역` 관리 탭(템플릿 CRUD·단건 즉시 반영), SQLite DB 백업 다운로드 버튼, `apiFetch` 적용 |
| `src/components/ConnectModal.tsx` | `apiFetch` 전환 |
| `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` | 모바일 홈 화면 추가(PWA/iOS)용 PNG 아이콘 및 `public/manifest.json` / `src/app/layout.tsx` 메타데이터 연결 |
| `package.json` | 미사용 `better-sqlite3` 제거 및 `"typecheck": "tsc --noEmit"` 스크립트 추가 |

### C. macOS 상시 서버 자동 실행 (`launchd`), 로그 로테이션 및 자동 백업
| 파일 경로 | 역할 |
| :--- | :--- |
| `scripts/run-server.sh` | `launchd` 전용 포그라운드 서버 실행기 (`.env.local` 로드, 미빌드 시 자동 빌드, 5MB 초과 로그 로테이션, `/usr/bin/caffeinate -s` 유휴 잠자기 방지) |
| `scripts/run-tunnel.sh` | `launchd` 전용 포그라운드 터널 실행기 (5MB 로그 로테이션, `CLOUDFLARE_TUNNEL_TOKEN` 지원, Quick Tunnel `CURRENT_URL.txt` 갱신 및 텔레그램 URL 변경 알림 옵션) |
| `scripts/backup-db.mjs` | `node:sqlite` `VACUUM INTO` 기반 무중단 DB 스냅샷 생성 및 30일 초과 백업 자동 정리 |
| `start.sh`, `status.sh`, `stop.sh` | macOS `ipconfig getifaddr en0/en1` 기반 사설 IP 검출 수정 및 `stop.sh`의 `launchd` unload 지원 |
| `~/Library/LaunchAgents/com.kimjiho.home-budget-server.plist` | 로그인/재부팅 시 가계부 웹 서버 자동 실행 및 종료 시 자동 재시작(`KeepAlive`) |
| `~/Library/LaunchAgents/com.kimjiho.home-budget-tunnel.plist` | 로그인/재부팅 시 Cloudflare 터널 자동 실행 및 종료 시 자동 재시작(`KeepAlive`) |
| `~/Library/LaunchAgents/com.kimjiho.home-budget-backup.plist` | 매일 새벽 `03:30` `scripts/backup-db.mjs` 자동 실행 |

---

## 3. 전원 · 잠자기 및 재부팅 자동 실행 설정 상태

1. **전원 / 잠자기 설정 (`pmset`)**
   - `sleep 0`, `disksleep 0` 설정이 적용되어 있으며, `scripts/run-server.sh`가 `/usr/bin/caffeinate -s`로 서버를 실행해 AC 전원 연결 중 유휴 잠자기를 차단합니다.
   - 상태 확인 명령어:
     ```bash
     pmset -g | grep -E "sleep|disksleep"
     pmset -g assertions | grep caffeinate
     ```
2. **재부팅 시 동작 방식**
   - 두 서비스는 `~/Library/LaunchAgents`에 등록되어 있어 **재부팅 후 사용자(`kimjiho`)로 macOS 로그인 시 자동 시작**됩니다.
   - 무인 서버로 완전히 자동 복구되려면 **시스템 설정 → 사용자 및 그룹 → 자동 로그인**을 켜 두거나, 재부팅 후 한 번 로그인해 주어야 합니다.
   - 현재 무료 Quick Tunnel 상태에서는 재부팅 시 외부 `*.trycloudflare.com` 주소가 새로 발급되므로, 재부팅 후 `./status.sh` 또는 집 와이파이 QR 모달에서 새 주소를 확인하세요.

---

## 4. 로그인 비밀번호 관리 방법

초기 설치 시 랜덤 비밀번호가 생성되어 `data/budget.db`의 `app_meta` 테이블(`auth_password_hash`)에 암호화(`scrypt`) 저장되었습니다. *(보안상 실제 비밀번호 원문은 이 문서에 기록하지 않습니다.)*

### 비밀번호 변경 방법 (3가지 중 택1)
1. **웹 앱 화면에서 변경 (권장)**
   - 로그인 후 **설정 → 로그인 비밀번호 · 잠금 설정**에서 현재 비밀번호와 새 비밀번호(4자 이상)를 입력해 변경합니다.
   - 비밀번호를 변경하면 `auth_version`이 갱신되어 다른 기기에 남아있던 기존 로그인 세션은 즉시 만료됩니다.
2. **맥북 터미널에서 강제 재설정 (비밀번호 분실 시)**
   ```bash
   cd /Users/kimjiho/Gemini_Project/Home_Budget
   node scripts/set-password.mjs "새비밀번호"
   ```
3. **`.env.local` 환경 변수로 고정 관리 (선택)**
   - `.env.local`에 `APP_PASSWORD=원하는비밀번호`를 입력하고 서버를 재시작하면 해당 비밀번호가 우선 적용됩니다.

---

## 5. 외부 접속 및 무료 고정 터널 전환 가이드

### 현재 상태: 무료 Quick Tunnel
- 별도 회원가입·도메인 없이 동작하는 Cloudflare 무료 Quick Tunnel이 실행 중입니다.
- 현재 외부 URL 확인:
  ```bash
  cd /Users/kimjiho/Gemini_Project/Home_Budget
  ./status.sh
  ```

### 추후 고정 주소(`https://budget.내도메인.com`)로 전환할 때
> **주의**: Cloudflare에서 고정 주소를 무료로 연결하려면 **이미 보유한 본인 명의의 도메인 1개**가 필요합니다. (도메인 구매 없이 입력하면 도메인 등록/구매 화면으로 안내됩니다.)

1. **Cloudflare에 기존 도메인 연결 (무료 플랜)**
   - `https://dash.cloudflare.com` 로그인 (우측 상단 지구본 아이콘에서 **한국어** 선택 가능)
   - **도메인 등록(Register a domain)** 이 아니라, **`+ 추가` 또는 웹사이트(Websites) → 도메인 온보드(Onboard a domain)** 로 이동
   - 보유 도메인 입력 후 **Free (무료, $0)** 요금제 선택
   - 안내된 Cloudflare 네임서버 2개를 도메인 구입처(가비아, 후이즈, Porkbun 등)에 등록
2. **터널 생성 및 토큰 복사 (최신 대시보드 경로)**
   - **경로 A**: 왼쪽 메뉴 **네트워킹(Networking) → 터널(Tunnels)**
   - **경로 B**: 왼쪽 메뉴 **Zero Trust → 네트워크(Networks) → 커넥터(Connectors) → 터널(Tunnels)**
   - **터널 만들기** → **Cloudflare Tunnel (`Cloudflared`)** 선택 → 이름 입력 후 저장
   - **macOS** 선택 후 `--token` 뒤의 긴 토큰 문자열 복사
   - 다음 단계 **공개 호스트 이름(Public Hostname)** 에 하위 도메인(예: `budget`), 도메인, 서비스 `HTTP`, URL `localhost:3000` 입력 후 저장
3. **맥북에 적용 (재부팅 불필요)**
   ```bash
   cd /Users/kimjiho/Gemini_Project/Home_Budget
   cp .env.local.example .env.local
   ```
   `.env.local`에 아래 두 줄 입력 후 저장:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=복사한_터널_토큰
   PUBLIC_URL=https://budget.내도메인.com
   ```
   터널 서비스만 즉시 재시작:
   ```bash
   launchctl kickstart -k "gui/$(id -u)/com.kimjiho.home-budget-tunnel"
   ./status.sh
   ```

---

## 6. 일상 운영 및 추후 수정 작업 Runbook

### 상태 및 로그 확인
```bash
cd /Users/kimjiho/Gemini_Project/Home_Budget
./status.sh
launchctl list | grep home-budget
```
- 서버 로그: `logs/launchd-server.log`
- 터널 로그: `logs/launchd-tunnel.log` *(서버·터널 로그는 5MB 초과 시 `.1`로 자동 로테이션됩니다)*

### (선택) Quick Tunnel 주소 변경 시 텔레그램 알림 받기
`.env.local`에 아래 두 값을 추가하고 터널을 재시작하면, 재부팅 등으로 `*.trycloudflare.com` 주소가 바뀔 때마다 텔레그램으로 새 URL을 전송합니다.
```env
TELEGRAM_BOT_TOKEN=텔레그램_봇_토큰
TELEGRAM_CHAT_ID=본인_채팅_ID
```

### 코드 수정 후 서버 반영 (빌드 + 재시작)
추후 기능 추가나 UI/API 수정이 끝난 뒤에는 반드시 아래 순서로 빌드 및 재시작을 실행하세요.
```bash
cd /Users/kimjiho/Gemini_Project/Home_Budget
npm run build
launchctl kickstart -k "gui/$(id -u)/com.kimjiho.home-budget-server"
```

### 서비스 일시 중지 / 다시 시작 (`launchd` 기준)
> **참고**: `KeepAlive=true` 설정 때문에 `./stop.sh`로 프로세스만 죽이면 `launchd`가 10초 뒤 자동으로 다시 살립니다. 완전히 중지하려면 `launchctl unload`를 사용하세요.

- **일시 중지**:
  ```bash
  launchctl unload ~/Library/LaunchAgents/com.kimjiho.home-budget-tunnel.plist
  launchctl unload ~/Library/LaunchAgents/com.kimjiho.home-budget-server.plist
  ```
- **다시 시작**:
  ```bash
  launchctl load -w ~/Library/LaunchAgents/com.kimjiho.home-budget-server.plist
  launchctl load -w ~/Library/LaunchAgents/com.kimjiho.home-budget-tunnel.plist
  ```

### 가계부 데이터 점검 · 백업 · 안전 복구 (유지보수)
가계부 DB(`data/budget.db`)는 Git에 올라가지 않으며, WAL 동시 접근 대기(`busy_timeout=5000`), 조회 인덱스, 무결성 검증 백업으로 보호됩니다.
1. **매일 새벽 03:30 자동 백업 (`launchd`)**: `com.kimjiho.home-budget-backup`이 `scripts/backup-db.mjs`를 실행해 `data/backups/budget_YYYY-MM-DD.db` 생성 및 무결성 검사 후 **iCloud Drive(`Home_Budget_Backups`)**에도 사본을 자동 저장합니다(각 최대 14개 보관).
2. **웹 앱에서 상태 확인 및 즉시 다운로드**: 로그인 후 **설정 → 보안** 패널에서 DB 무결성·스키마 버전·백업 개수를 확인하고 **DB 백업 다운로드** 버튼으로 내려받을 수 있습니다.
3. **터미널 점검 / 백업 / 복구 명령어**:
```bash
cd /Users/kimjiho/Gemini_Project/Home_Budget
npm run db:check                                          # DB 무결성, WAL 크기, 인덱스, 백업 목록 점검
npm run db:backup                                         # 즉시 백업 + 무결성 검증 + iCloud 사본 저장
node scripts/restore-db.mjs --list                        # 복구 가능한 백업 목록 보기
node scripts/restore-db.mjs data/backups/budget_YYYY-MM-DD.db --yes  # 서버 안전 정지 → 기존 DB 보관 → 복구 → 재시작
```

---

## 7. 추후 진행 예정 / 확인 체크리스트

- [x] 로그인 인증·문서 및 전체 기능 확장 코드 GitHub(`origin/main`) 반영 완료
- [ ] (선택) 본인 도메인 준비 시 `.env.local` 설정 후 고정 Cloudflare 터널로 전환
- [ ] (선택) Quick Tunnel 주소 자동 알림이 필요하면 `.env.local`에 `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` 설정
- [ ] (선택) 도메인 없이 고정 주소가 필요할 경우 Tailscale 설치 검토
- [ ] (선택) 무인 재부팅 복구가 필요하면 macOS 자동 로그인 및 재부팅 후 자동 실행 테스트 진행
