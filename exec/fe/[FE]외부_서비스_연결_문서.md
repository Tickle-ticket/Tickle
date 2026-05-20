# Tickle FE 외부 서비스 연동 정보

## 1. 외부 서비스 목록

| 서비스 | 사용 위치 | 용도 | 필수 여부 |
|--------|-----------|------|-----------|
| Core BE API | `view/fe/tickle/src/shared/api/*` | 이벤트, 좌석, 예매, 결제, 관리자/기획사 API 호출 | 필수 |
| Auth API | `view/fe/tickle/src/shared/api/authConfig.ts`, 인증 화면 | 로그인, 회원가입, 토큰 재발급, 사용자 인증 | 필수 |
| AI Public API | `behaviorApi.ts`, `botDetectionApi.ts`, tracking hooks | 행동 데이터 수집, 봇 탐지/모니터링 | AI/봇 탐지 사용 시 필수 |
| Kakao Developers OAuth | `src/shared/lib/kakaoOAuth.ts`, OAuth route | 카카오 로그인/회원가입 authorization URL 생성 | 카카오 로그인 사용 시 필수 |
| KakaoPay | 결제 화면 및 Core BE 결제 API | 카카오페이 결제 redirect 처리 | 카카오페이 결제 사용 시 필수 |
| Cloudflare Turnstile | `DetailView.tsx`, `Turnstile.tsx` | 봇 방지 client challenge | 봇 방지 사용 시 필수 |
| AWS S3/Public Image CDN | Next Image remote pattern | 이벤트/프로필 이미지 표시 | 이미지 표시 시 필요 |
| MSW | `src/shared/api/mock/*`, `MSWProvider.tsx` | 로컬/스토리북 mock API | 개발/테스트 시 선택 |
| GitLab | Jenkins checkout | 소스 저장소 | 배포 시 필수 |
| Jenkins | `view/fe/Jenkinsfile` | FE 빌드 및 EC2 배포 | 자동 배포 시 필수 |
| EC2/Nginx/Docker | `docker-compose.yml`, host Nginx | 운영 FE 컨테이너 실행 및 외부 트래픽 프록시 | 운영 배포 시 필수 |
| Mattermost Webhook | `view/fe/Jenkinsfile` | FE 배포 성공/실패 알림 | 알림 사용 시 필요 |
| npm Registry/pnpm Registry | `pnpm install` | Node dependency 다운로드 | 빌드 시 필수 |

## 2. Core BE API

### 2.1 사용 목적

- 공연/이벤트 조회
- 좌석 조회 및 선점
- 예매/결제/취소표 API 호출
- 관리자/기획사 페이지 데이터 조회 및 변경
- 대기열 API 호출

### 2.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_URL` | Core BE API base URL |
| `NEXT_PUBLIC_UPLOAD_API_PATH` | 업로드 API path override. 기본값 `/api/v1/uploads` |

### 2.3 설정 파일

- `view/fe/tickle/src/shared/api/client.ts`
- `view/fe/tickle/src/shared/api/adminApi.ts`
- `view/fe/tickle/src/shared/api/bookingApi.ts`
- `view/fe/tickle/src/shared/api/eventApi.ts`
- `view/fe/tickle/src/shared/api/queueApi.ts`
- `view/fe/tickle/src/shared/api/uploadApi.ts`
- `view/fe/tickle/src/features/*/api/*`

## 3. Auth API

### 3.1 사용 목적

- 자체 로그인/회원가입
- 카카오 로그인 callback 처리
- 사용자 프로필 조회
- 토큰 기반 인증 처리

### 3.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_AUTH_API_URL` | Auth API base URL |
| `NEXT_PUBLIC_USER_API_URL` | 사용자 API base URL을 별도로 분리할 때 사용 |
| `NEXT_PUBLIC_API_URL` | Auth URL fallback으로도 사용 |

### 3.3 설정 파일

- `view/fe/tickle/src/shared/api/authConfig.ts`
- `view/fe/tickle/src/shared/api/userConfig.ts`
- `view/fe/tickle/src/shared/api/authApi.ts`
- `view/fe/tickle/src/shared/api/userApi.ts`
- `view/fe/tickle/src/shared/api/tokenManager.ts`

## 4. AI Public API

### 4.1 사용 목적

- 사용자 행동 데이터 전송
- 봇 탐지 API 호출
- 관리자 봇 탐지/서버 모니터링 화면 데이터 연동

### 4.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_AI_PUBLIC_API_URL` | AI public API base URL |
| `NEXT_PUBLIC_INTERNAL_SECRET` | AI API 요청 시 `X-Internal-Secret` 헤더로 전달하는 값 |

### 4.3 설정 파일

- `view/fe/tickle/src/shared/api/behaviorApi.ts`
- `view/fe/tickle/src/shared/api/botDetectionApi.ts`
- `view/fe/tickle/src/shared/hooks/useMouseTracking.ts`
- `view/fe/tickle/src/shared/tracking/*`

## 5. Kakao Developers OAuth

### 5.1 사용 목적

- 카카오 로그인/회원가입 authorization URL 생성
- OAuth state cookie 생성 및 callback 검증
- Auth API와 연동해 서비스 로그인 처리

### 5.2 Kakao Developers에서 필요한 설정

| 항목 | 설명 |
|------|------|
| 앱 생성 | Kakao Developers에서 애플리케이션 생성 |
| 플랫폼 Web 등록 | 운영 도메인 및 로컬 개발 도메인 등록 |
| Redirect URI 등록 | 운영 `NEXT_PUBLIC_KAKAO_REDIRECT_URI`와 동일하게 등록 |
| 동의항목 | 이메일, 프로필 닉네임, 프로필 이미지 등 서비스 정책에 맞게 설정 |
| REST API Key | FE `NEXT_PUBLIC_KAKAO_REST_API_KEY` 또는 서버 환경 변수로 주입 |

### 5.3 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_KAKAO_REST_API_KEY` | Kakao Developers REST API Key |
| `NEXT_PUBLIC_KAKAO_REDIRECT_URI` | 카카오 OAuth redirect URI |
| `NEXT_PUBLIC_KAKAO_SCOPE` | 요청 scope. 기본값 `account_email,profile_nickname,profile_image` |

### 5.4 설정 파일

- `view/fe/tickle/src/shared/lib/kakaoOAuth.ts`
- `view/fe/tickle/src/app/oauth/kakao/route.ts`
- `view/fe/tickle/src/app/oauth/kakao/login/route.ts`
- `view/fe/tickle/src/app/oauth/callback/page.tsx`
- `view/fe/tickle/src/app/login/kakao/callback/page.tsx`

## 6. KakaoPay

### 6.1 사용 목적

- 예매 결제 수단으로 카카오페이 선택
- Core BE의 결제 준비/승인 API 호출 이후 카카오페이 redirect URL로 이동
- 결제 성공/실패/취소 화면 처리

### 6.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_PAYMENT_BASE_URL` | FE 결제 callback/redirect URL 생성 기준 |
| `NEXT_PUBLIC_API_URL` | Core BE 결제 API 호출 base URL |

KakaoPay Secret Key, CID 등 서버 검증에 필요한 값은 FE가 아니라 Core BE 환경 변수로 관리합니다.

### 6.3 설정 파일

- `view/fe/tickle/src/features/book/ui/components/PaymentStep.tsx`
- `view/fe/tickle/src/shared/api/paymentApi.ts`
- `view/fe/tickle/src/app/payment/success/page.tsx`
- `view/fe/tickle/src/app/payment/fail/page.tsx`
- `view/fe/tickle/src/app/payment/cancel/page.tsx`

## 7. Cloudflare Turnstile

### 7.1 사용 목적

- 상세/예매 진입 구간에서 봇 방지 challenge 제공
- FE는 site key로 widget/token을 생성하고, BE는 secret key로 token을 검증

### 7.2 Cloudflare에서 필요한 설정

| 항목 | 설명 |
|------|------|
| Turnstile site 생성 | Cloudflare Turnstile 콘솔에서 site 생성 |
| Domain 등록 | 운영 도메인과 로컬 테스트 도메인 등록 |
| Site Key | FE `NEXT_PUBLIC_TURNSTILE_SITE_KEY`에 주입 |
| Secret Key | Core BE `CLOUDFLARE_TURNSTILE_SECRET_KEY`에 주입 |

### 7.3 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile client site key |

### 7.4 설정 파일

- `view/fe/tickle/src/features/detail/ui/DetailView.tsx`
- `view/fe/tickle/src/shared/components/Turnstile.tsx`
- `view/fe/tickle/src/shared/components/ReCaptcha.tsx`

## 8. AWS S3/Public Image CDN

### 8.1 사용 목적

- 이벤트 포스터, 공연 이미지, 프로필 이미지 표시
- Next Image remote optimization 허용 도메인 관리

### 8.2 필요 정보

| 항목 | 설명 |
|------|------|
| S3 Bucket public URL 또는 CloudFront URL | FE 이미지 표시 URL |
| 허용 이미지 도메인 | `next.config.ts`의 `images.remotePatterns`에 등록 |

### 8.3 현재 허용 도메인

| 도메인 | 용도 |
|--------|------|
| `ssafy-tickle-ticket-2026.s3.ap-northeast-2.amazonaws.com` | Tickle 이미지 저장소 |
| `ticketimage.interpark.com` | 외부 공연 이미지 |
| `tkfile.yes24.com` | 외부 공연 이미지 |
| `images.unsplash.com` | 샘플 이미지 |
| `i.namu.wiki` | 샘플/외부 이미지 |
| `i.pravatar.cc` | 프로필 샘플 이미지 |
| `picsum.photos` | 샘플 이미지 |

### 8.4 설정 파일

- `view/fe/tickle/next.config.ts`
- `view/fe/tickle/src/shared/utils/resolveImageSrc.ts`

## 9. MSW

### 9.1 사용 목적

- 로컬 개발 및 Storybook에서 BE 없이 mock API 응답 제공
- `NEXT_PUBLIC_API_MOCKING=enabled`일 때 browser worker 시작

### 9.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_MOCKING` | `enabled`이면 MSW 활성화, 운영은 `disabled` 권장 |
| `NEXT_PUBLIC_MOCK_EVENT_ID` | 공통 mock 이벤트 ID |
| `NEXT_PUBLIC_MOCK_LOGIN_EVENT_ID` | 로그인 mock 이벤트 ID |
| `NEXT_PUBLIC_MOCK_BOOKING_COMPLETE_EVENT_ID` | 예매 완료 mock 이벤트 ID |

### 9.3 설정 파일

- `view/fe/tickle/public/mockServiceWorker.js`
- `view/fe/tickle/src/shared/providers/MSWProvider.tsx`
- `view/fe/tickle/src/shared/api/mock/*`
- `view/fe/tickle/src/shared/config/mockEventConfig.ts`

## 10. GitLab, Jenkins, EC2/Nginx/Docker

### 10.1 사용 목적

- GitLab: FE 소스 checkout
- Jenkins: FE dependency 설치, Next.js build, 산출물 압축 및 EC2 전송
- EC2/Docker: `tickle-fe` 컨테이너 실행
- Nginx: 외부 80/443 요청을 FE 컨테이너로 reverse proxy

### 10.2 필요 정보

| 항목 | 설명 |
|------|------|
| GitLab Repository URL | Jenkins checkout 및 개발자 clone에 사용 |
| Jenkins NodeJS Tool `node20` | FE 빌드용 Node.js 20 |
| Jenkins Credential `fe-ec2-key` | EC2 SSH 접속용 private key |
| EC2 접속 정보 | `EC2_USER`, `EC2_IP`, `TARGET_DIR`, `FE_TARGET_DIR` |
| Docker Compose | 루트 `docker-compose.yml`의 `tickle-fe` 서비스 |
| Nginx 설정 | 운영 도메인 80/443 reverse proxy |

### 10.3 설정 파일

- `view/fe/Jenkinsfile`
- `docker-compose.yml`
- `view/fe/tickle/Dockerfile`
- `view/fe/tickle/.dockerignore`

## 11. Mattermost Webhook

### 11.1 사용 목적

- Jenkins FE 배포 성공/실패 알림

### 11.2 필요 정보

| 항목 | 설명 |
|------|------|
| `MATTERMOST_WEBHOOK` | Mattermost Incoming Webhook URL |
| Jenkins post action | 성공/실패 메시지 전송 |

### 11.3 설정 파일

- `view/fe/Jenkinsfile`

## 12. npm Registry/pnpm Registry

### 12.1 사용 목적

- Next.js, React, Storybook, Playwright, Vitest 등 Node dependency 다운로드

### 12.2 필요 정보

- 별도 가입 불필요
- 빌드 환경에서 npm registry 접근 가능해야 함
- Jenkins 빌드 시 `npm install -g pnpm`이 가능해야 함

### 12.3 설정 파일

- `view/fe/tickle/package.json`
- `view/fe/tickle/pnpm-lock.yaml`

## 13. 비밀값 관리 원칙

- `NEXT_PUBLIC_*` 환경 변수는 브라우저에 노출될 수 있으므로 Secret 값을 넣지 않습니다.
- Kakao REST API Key, Turnstile Site Key처럼 client 공개가 전제된 값만 FE 환경 변수로 관리합니다.
- KakaoPay Secret Key, Turnstile Secret Key, JWT Secret, DB 계정, S3 Access Key는 BE/Auth/Infra 환경 변수로만 관리합니다.
- Jenkinsfile, `.env`, `.env.local`, Webhook URL, SSH key에 실제 운영 비밀값이 노출되면 즉시 재발급하고 기존 키를 폐기합니다.
