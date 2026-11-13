# 🏠 우리집 가계부 (Home Budget)

모바일과 PC에서 온 가족이 함께 기록하고 관리하는 **호주 달러(AUD) 기반 반응형 PWA 스마트 가계부**입니다.  
로컬 SQLite(`node:sqlite`) 데이터베이스에 안전하게 저장되며, **QR 코드 간편 접속**과 **Cloudflare Tunnel**을 통해 외부(LTE/5G)에서도 손쉽게 접속할 수 있습니다.

---

## 📌 주요 기능

- **모바일 · PC 완전 반응형 UI**:
  - **모바일**: 상단 월 이동/필터 + 하단 앱 스타일 네비게이션 바 + 터치 최적화 카드 리스트
  - **PC**: 좌측 고정 사이드바 + 구성원 칩 필터 + 3열 KPI 카드 + 테이블형 거래 내역 + 2컬럼 통계/설정 화면
- **다크 모드 지원**: 시스템 테마 자동 감지 및 수동 라이트/다크 토글 (`localStorage` 유지)
- **호주 달러(AUD) 센트 지원**: 모든 잔액·수입·지출을 `A$1,234.50` 형식으로 표시하며 소수점 둘째 자리까지 저장 (`+A$5`~`+A$100` 빠른 입력 버튼 포함)
- **청소대행 업체 자영업자 맞춤 수입 카테고리**:
  - 기본 수입 항목: `정기청소`, `이사/입주청소`, `일반/단건청소`, `특수/추가청소`, `사업정산/환급`, `기타사업수입`
- **가족 구성원 & 카테고리 직접 설정**:
  - 구성원 추가·이름/색상 수정·삭제 (이름 수정 시 기존 거래 내역도 자동 반영)
  - 지출/수입 카테고리 직접 추가·수정·삭제 및 색상/아이콘 선택 (내역 입력 중 인라인 빠른 추가 지원)
- **쉬운 기기 연결 (QR 코드 · 원클릭 공유)**:
  - 웹 앱 내 **`기기 연결 · QR 코드`** 모달과 터미널 실행 시 **QR 코드 자동 출력**으로 긴 주소 입력 없이 바로 접속
  - 스마트폰 브라우저에서 **[홈 화면에 추가]** 시 PWA 네이티브 앱처럼 전체 화면 실행

---

## 💻 다른 시스템(새 PC / 미니PC / 서버)에 설치하기

### 1. 사전 준비 (필수 소프트웨어)
이 프로젝트는 Node.js 내장 `node:sqlite` 모듈을 사용하므로 별도의 DB 서버 설치가 필요 없지만, **`node:sqlite`를 지원하는 Node.js(v22.5 이상, 권장 v24~v26 LTS/Current)**가 필요합니다.

- **Git**
- **Node.js** `v22.5+` (`node -v`로 확인)
- *(선택)* **cloudflared** — 집 밖(LTE/5G/외부 와이파이)에서 접속할 때 필요

#### Linux(Arch / Ubuntu 등)에서 `cloudflared` 설치 예시
```bash
mkdir -p ~/.local/bin
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ~/.local/bin/cloudflared
chmod +x ~/.local/bin/cloudflared
```
*(macOS는 `brew install cloudflared`, ARM64 라즈베리파이는 `cloudflared-linux-arm64` 바이너리를 사용하세요.)*

---

### 2. 저장소 복제 및 빌드
새 시스템의 터미널에서 아래 명령어를 순서대로 실행합니다.

```bash
# 1) GitHub에서 소스 코드 내려받기
git clone https://github.com/kimjiho680629/Home_budget.git
cd Home_budget

# 2) 패키지 설치 및 프로덕션 빌드
npm install
npm run build
```

---

### 3. 서비스 실행 및 관리
```bash
# 가계부 웹 서버 + Cloudflare 외부 터널 + QR 코드 출력 시작
./start.sh

# 현재 서버/터널 동작 상태 및 QR 코드 다시 보기
./status.sh

# 서버 및 터널 중지
./stop.sh
```
- `cloudflared`가 없는 환경에서는 `./start.sh`가 자동으로 **로컬/집 안 와이파이 주소(`http://<내부IP>:3000`) + QR 코드**로 실행합니다.
- 개발 모드로 실행할 때는 `npm run dev`를 사용할 수 있습니다.

---

### 4. (선택) 매번 바뀌지 않는 고정 짧은 외부 주소 사용하기
기본 Quick Tunnel(`*.trycloudflare.com`)은 재시작할 때마다 주소가 바뀝니다. 본인 도메인으로 `https://budget.내도메인.com` 같은 고정 주소를 쓰려면:

1. Cloudflare Zero Trust 대시보드에서 무료 Tunnel을 생성해 토큰과 도메인(`http://localhost:3000`)을 연결합니다.
2. `.env.local.example`을 복사해 `.env.local`을 만들고 토큰과 주소를 입력합니다.
   ```bash
   cp .env.local.example .env.local
   # .env.local 내부에 CLOUDFLARE_TUNNEL_TOKEN 과 PUBLIC_URL 입력
   ```
3. `./start.sh`를 실행하면 자동으로 고정 터널이 연결됩니다.

---

## 💾 데이터 백업 및 다른 시스템으로 데이터 이전

가계부 데이터(`data/budget.db`)는 보안을 위해 GitHub에 올라가지 않습니다. 기존 PC의 데이터를 새 시스템으로 옮기려면 아래 두 가지 방법 중 하나를 사용하세요.

### 방법 A: 서버 중지 후 복사 (권장)
```bash
# 기존 PC에서 서버 중지 후 data 폴더 전체 복사
./stop.sh
# data/ 폴더를 USB/클라우드/scp 등으로 새 시스템의 Home_budget/data/ 위치에 복사
```

### 방법 B: 서버가 켜진 상태에서 안전하게 백업 (WAL 파일 포함 병합)
```bash
sqlite3 data/budget.db ".backup '/원하는/경로/budget_backup.db'"
```
새 시스템에서 `./stop.sh` 상태일 때 백업 파일을 `Home_budget/data/budget.db`로 덮어쓰고 `./start.sh`를 실행하면 기존 데이터가 그대로 복구됩니다.

---

## 📁 프로젝트 구조
```text
Home_budget/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── categories/route.ts   # 카테고리 조회·추가·수정·삭제 API
│   │   │   ├── connection/route.ts   # 로컬/외부 접속 주소 및 QR 코드 API
│   │   │   ├── summary/route.ts      # 월별 수입·지출·통계 API
│   │   │   ├── transactions/route.ts # 거래 내역 조회·등록·수정·삭제 API
│   │   │   └── users/route.ts        # 가족 구성원 조회·추가·수정·삭제 API
│   │   ├── globals.css               # Tailwind CSS v4 및 다크모드 설정
│   │   ├── layout.tsx                # 반응형 루트 레이아웃 및 FOUC 방지
│   │   └── page.tsx                  # 모바일/PC 반응형 메인 앱
│   ├── components/                   # 대시보드·내역·통계·설정·폼·QR 연결 UI
│   ├── lib/
│   │   ├── db.ts                     # SQLite 연결·테이블 초기화·마이그레이션
│   │   ├── currency.ts               # 호주 달러(AUD) 포맷 유틸리티
│   │   └── constants.ts              # 색상 팔레트 및 아이콘 목록
│   └── types/budget.ts               # 공통 TypeScript 타입
├── scripts/print-qr.mjs              # 터미널 QR 코드 출력 스크립트
├── public/                           # PWA 매니페스트 및 아이콘
├── .env.local.example                # 고정 Cloudflare 터널 설정 예시
├── start.sh / stop.sh / status.sh    # 서비스 관리 스크립트
└── package.json
```
