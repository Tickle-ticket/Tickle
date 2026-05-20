# Tickle FE 빌드 및 배포 매뉴얼

## 1. 프로젝트 개요

Tickle 프론트엔드는 Next.js 기반 웹 애플리케이션입니다. 사용자 예매, 대기열, 결제, 마이페이지, 관리자/기획사 화면을 제공합니다.

| 구분 | 경로 | 설명 |
|------|------|------|
| FE App | `view/fe/tickle` | Next.js App Router 기반 프론트엔드 |
| FE Jenkins | `view/fe/Jenkinsfile` | FE 빌드 및 EC2 배포 파이프라인 |
| FE Dockerfile | `view/fe/tickle/Dockerfile` | Next.js standalone 산출물 실행 이미지 |
| Root Compose | `docker-compose.yml` | 운영 서버의 `tickle-fe` 컨테이너 정의 |

## 2. 사용 제품 및 버전

### 2.1 Frontend

| 항목 | 제품/버전 | 설정 위치 |
|------|-----------|-----------|
| Runtime | Node.js 20 | `view/fe/Jenkinsfile`, `view/fe/tickle/Dockerfile` |
| Package Manager | pnpm 11.1.3 계열 | `view/fe/tickle/package.json`, `view/fe/tickle/pnpm-lock.yaml` |
| Framework | Next.js 16.2.4 | `view/fe/tickle/package.json` |
| React | React 19.2.4, React DOM 19.2.4 | `view/fe/tickle/package.json` |
| Language | TypeScript 5 계열 | `view/fe/tickle/package.json`, `view/fe/tickle/tsconfig.json` |
| Styling | Tailwind CSS 4, PostCSS | `view/fe/tickle/package.json`, `view/fe/tickle/postcss.config.mjs` |
| State/Data | Zustand 5, TanStack React Query 5 | `view/fe/tickle/package.json` |
| Chart | Recharts 3 | `view/fe/tickle/package.json` |
| Animation | Framer Motion 12, Lottie React | `view/fe/tickle/package.json` |
| UI 문서 | Storybook 10 | `view/fe/tickle/package.json` |
| E2E Test | Playwright 1.59 | `view/fe/tickle/playwright.config.ts` |
| Unit/Browser Test | Vitest 4 | `view/fe/tickle/vitest.config.ts` |

### 2.2 Web Server/WAS

| 항목 | 제품/버전 | 설정 위치 |
|------|-----------|-----------|
| FE WAS | Next.js standalone Node server | `view/fe/tickle/next.config.ts`, `view/fe/tickle/Dockerfile` |
| Container Runtime Image | `node:20-alpine` | `view/fe/tickle/Dockerfile` |
| Host Reverse Proxy | Nginx | EC2 host 설정, `view/fe/Jenkinsfile`의 `sudo systemctl reload nginx` |
| Container Port | `3000` | `docker-compose.yml`, `view/fe/tickle/Dockerfile` |

`next.config.ts`는 `output: 'standalone'`을 사용합니다. 따라서 배포 시 전체 소스가 아니라 `.next/standalone`, `.next/static`, `public`, `Dockerfile`, `.dockerignore`만 전송해 컨테이너 이미지를 재빌드합니다.

### 2.3 IDE

| 항목 | 권장 값 |
|------|---------|
| Frontend IDE | Visual Studio Code 또는 WebStorm 2024.3 이상 |
| Node.js | 20.x |
| Package Manager | pnpm 11.x |
| TypeScript SDK | workspace TypeScript 사용 |
| ESLint | workspace ESLint 설정 사용 |

## 3. GitLab 소스 클론 이후 로컬 빌드

```bash
git clone <GitLab Repository URL>
cd <repository>/view/fe/tickle
npm install -g pnpm
pnpm install --frozen-lockfile --shamefully-hoist
pnpm approve-builds || true
pnpm build
```

생성 산출물:

```text
view/fe/tickle/.next
view/fe/tickle/.next/standalone
view/fe/tickle/.next/static
```

## 4. 로컬 실행

### 4.1 개발 서버

```bash
cd view/fe/tickle
pnpm dev
```

기본 접속 주소:

```text
http://localhost:3000
```

### 4.2 Production 빌드 실행

```bash
cd view/fe/tickle
pnpm build
pnpm start
```

### 4.3 Storybook 실행

```bash
cd view/fe/tickle
pnpm story
```

기본 접속 주소:

```text
http://localhost:6006
```

## 5. Docker 실행

루트 디렉터리에 FE 환경 변수를 포함한 `.env`를 작성한 뒤 실행합니다.

```bash
docker compose up -d --build tickle-fe
```

컨테이너 설정:

| 항목 | 값 |
|------|----|
| 서비스명 | `tickle-fe` |
| 컨테이너명 | `tickle-fe` |
| 빌드 컨텍스트 | `./view/fe/tickle` |
| Dockerfile | `view/fe/tickle/Dockerfile` |
| 포트 | Host `3000` -> Container `3000` |
| 재시작 정책 | `always` |
| env_file | `./view/fe/tickle/.env` |

## 6. Jenkins CD

FE 배포 파이프라인은 `view/fe/Jenkinsfile`을 사용합니다.

동작 방식:

1. GitLab 저장소 체크아웃
2. Jenkins NodeJS Tool `node20` 사용
3. `view/fe/tickle`에서 pnpm 설치 및 dependency 설치
4. `pnpm build`로 Next.js standalone 산출물 생성
5. `.next/standalone`, `.next/static`, `public`, `Dockerfile`, `.dockerignore`를 `deploy.tar.gz`로 압축
6. EC2의 `/home/ubuntu/S14P31A203/view/fe/tickle`로 산출물 전송
7. EC2 루트 `/home/ubuntu/S14P31A203`에서 `docker compose build tickle-fe`
8. `docker compose up -d tickle-fe`
9. Host Nginx reload
10. `curl -I http://localhost:3000`, `curl -I http://localhost`로 배포 확인
11. Mattermost Webhook으로 성공/실패 알림

Jenkins에 필요한 Credential/환경:

| 이름 | 설명 |
|------|------|
| `node20` | Jenkins Global Tool Configuration의 NodeJS 20 설정 |
| `fe-ec2-key` | FE 배포 EC2 SSH private key credential |
| GitLab SCM Credential | Jenkins Job checkout에 필요한 GitLab 접근 권한 |
| `EC2_USER` | 배포 서버 SSH 사용자, 기본 `ubuntu` |
| `EC2_IP` | FE 배포 대상 EC2 접속 IP |
| `TARGET_DIR` | EC2의 프로젝트 루트 경로 |
| `FE_TARGET_DIR` | EC2의 FE 산출물 배치 경로 |
| `MATTERMOST_WEBHOOK` | 배포 결과 알림 Webhook URL |

## 7. 빌드 및 실행 환경 변수

Next.js의 `NEXT_PUBLIC_*` 환경 변수는 브라우저 번들에 포함됩니다. Secret 값은 넣지 않는 것을 원칙으로 하고, 서버 검증이 필요한 Secret은 BE/Auth 환경 변수로 관리합니다.

| 변수 | 용도 | 사용 위치 |
|------|------|-----------|
| `NEXT_PUBLIC_API_URL` | Core BE API base URL | `src/shared/api/client.ts`, `adminApi.ts`, `queueApi.ts`, 상세/좌석 API |
| `NEXT_PUBLIC_AUTH_API_URL` | Auth API base URL | `src/shared/api/authConfig.ts` |
| `NEXT_PUBLIC_USER_API_URL` | 사용자 API base URL override | `src/shared/api/userConfig.ts` |
| `NEXT_PUBLIC_AI_PUBLIC_API_URL` | AI/봇 탐지 public API base URL | `src/shared/api/behaviorApi.ts`, `botDetectionApi.ts` |
| `NEXT_PUBLIC_API_MOCKING` | MSW 활성화 여부. `enabled`일 때 mock worker 시작 | `src/shared/providers/MSWProvider.tsx` |
| `NEXT_PUBLIC_INTERNAL_SECRET` | AI/행동 데이터 요청 시 `X-Internal-Secret` 헤더 값 | `src/shared/api/behaviorApi.ts`, `botDetectionApi.ts`, `useMouseTracking.ts` |
| `NEXT_PUBLIC_KAKAO_REST_API_KEY` | 카카오 OAuth REST API Key | `src/shared/lib/kakaoOAuth.ts` |
| `NEXT_PUBLIC_KAKAO_REDIRECT_URI` | 카카오 OAuth redirect URI | `src/shared/lib/kakaoOAuth.ts` |
| `NEXT_PUBLIC_KAKAO_SCOPE` | 카카오 OAuth scope override | `src/shared/lib/kakaoOAuth.ts` |
| `NEXT_PUBLIC_PAYMENT_BASE_URL` | 결제 성공/실패/취소 redirect URL 생성 기준 | `src/features/book/ui/components/PaymentStep.tsx` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile client site key | `src/features/detail/ui/DetailView.tsx` |
| `NEXT_PUBLIC_UPLOAD_API_PATH` | 업로드 API path override, 기본 `/api/v1/uploads` | `src/shared/api/uploadApi.ts` |
| `NEXT_PUBLIC_MOCK_EVENT_ID` | Mock 이벤트 공통 ID | `src/shared/config/mockEventConfig.ts` |
| `NEXT_PUBLIC_MOCK_LOGIN_EVENT_ID` | Mock 로그인 이벤트 ID | `src/shared/config/mockEventConfig.ts` |
| `NEXT_PUBLIC_MOCK_BOOKING_COMPLETE_EVENT_ID` | Mock 예매 완료 이벤트 ID | `src/shared/config/mockEventConfig.ts` |
| `NODE_ENV` | production/development 실행 모드 | Docker Compose, Next.js |
| `PORT` | Next.js standalone server port | `docker-compose.yml`, `Dockerfile` |
| `HOSTNAME` | Next.js standalone listen host, Docker에서 `0.0.0.0` | `Dockerfile` |
| `CI` | Playwright CI 모드, retry/worker 제어 | `playwright.config.ts` |

환경 변수 정의 위치:

| 실행 위치 | 파일/설정 | 비고 |
|-----------|-----------|------|
| Jenkins 빌드 | `view/fe/Jenkinsfile`의 `environment` | `pnpm build` 시 주입 |
| 운영 Docker Compose | 루트 `.env`, `docker-compose.yml` | `tickle-fe` build args 및 runtime env |
| 운영 컨테이너 runtime | `view/fe/tickle/.env`, `docker-compose.yml` | `env_file`로 주입 |
| 로컬 개발 | `view/fe/tickle/.env.local` 또는 shell env | Git 커밋 금지 |

## 8. 배포 시 특이사항

- Dockerfile은 `.next/standalone` 산출물이 이미 존재한다는 전제로 동작합니다. Docker build 전에 반드시 `pnpm build`가 선행되어야 합니다.
- Host Nginx가 외부 80/443 요청을 `tickle-fe:3000` 또는 `localhost:3000`으로 프록시해야 합니다.
- `next.config.ts`의 `images.remotePatterns`에 허용된 이미지 도메인만 Next Image 최적화 대상으로 사용할 수 있습니다. 신규 이미지 CDN을 추가하면 해당 설정을 함께 수정해야 합니다.
- Playwright 설정은 `pnpm start`로 production 서버를 띄우는 전제입니다. 테스트 전 `pnpm build`가 필요합니다.
- `.env`, `.env.local`, 실제 API Key, Webhook URL, SSH key는 Git에 커밋하지 않습니다.

## 9. 주요 프로퍼티 파일 목록

주요 설정 파일:

| 파일 | 내용 |
|------|------|
| `view/fe/tickle/package.json` | FE dependency, script, Next/React/Storybook/Test 버전 |
| `view/fe/tickle/pnpm-lock.yaml` | pnpm lockfile |
| `view/fe/tickle/pnpm-workspace.yaml` | pnpm workspace/build dependency 승인 설정 |
| `view/fe/tickle/next.config.ts` | Next.js standalone output, TypeScript build 설정, 이미지 remote pattern |
| `view/fe/tickle/tsconfig.json` | TypeScript 컴파일 설정 |
| `view/fe/tickle/eslint.config.mjs` | ESLint 설정 |
| `view/fe/tickle/postcss.config.mjs` | PostCSS/Tailwind 설정 |
| `view/fe/tickle/Dockerfile` | FE runtime image 및 standalone server 실행 |
| `view/fe/tickle/.dockerignore` | Docker build 제외 파일 |
| `view/fe/Jenkinsfile` | FE Jenkins 빌드/배포 파이프라인 |
| `docker-compose.yml` | 운영 `tickle-fe` 컨테이너 설정 |
| `view/fe/tickle/playwright.config.ts` | Playwright E2E 테스트 설정 |
| `view/fe/tickle/vitest.config.ts` | Vitest 테스트 설정 |
| `view/fe/tickle/src/shared/api/*` | Core/Auth/AI API client 및 endpoint 설정 |
| `view/fe/tickle/src/shared/lib/kakaoOAuth.ts` | 카카오 OAuth URL/state/redirect 설정 |

## 10. 포트 목록

| 포트 | 서비스 |
|------|--------|
| `3000` | Next.js FE 애플리케이션 |
| `6006` | Storybook |
| `9323` | Playwright HTML reporter, 필요 시 |
