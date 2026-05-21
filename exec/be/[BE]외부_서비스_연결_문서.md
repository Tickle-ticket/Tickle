# Tickle 외부 서비스 연동 정보

## 1. 외부 서비스 목록

| 서비스 | 사용 위치 | 용도 | 필수 여부 |
|--------|-----------|------|-----------|
| Kakao Developers OAuth | `services/auth` | 카카오 로그인/회원가입 | 카카오 로그인 사용 시 필수 |
| KakaoPay | `services/be` | 티켓 결제, 취소표 결제 | 카카오페이 결제 사용 시 필수 |
| CoolSMS | `services/be`, `services/auth` | 휴대폰 인증, 취소표 문자 알림 | 휴대폰 인증/문자 알림 사용 시 필수 |
| AWS S3 | `services/be` | 프로필 이미지, 이벤트 이미지 업로드 | 이미지 업로드 사용 시 필수 |
| Cloudflare Turnstile | `services/be` | 봇 탐지/캡차 검증 | 봇 탐지 사용 시 필수 |
| AI 내부 서버 | `services/be` | AI inference callback 및 내부 연동 | AI 기능 사용 시 필수 |
| GitLab | Jenkins, 개발자 로컬 | 소스 저장소, Container Registry | 배포 시 필수 |
| Jenkins | `infra/docker-compose/server5-jenkins.yml` | CI/CD 자동 배포 | 자동 배포 시 필수 |
| Gradle/Maven Central | `services/be`, `services/auth` | Java dependency 다운로드 | 빌드 시 필수 |
| Mattermost Webhook | `Jenkinsfile` | 배포 성공/실패 알림 | 알림 사용 시 필요 |


## 2. Kakao Developers OAuth

### 2.1 사용 목적

- 카카오 계정 기반 로그인/회원가입
- Auth 서버에서 authorization code를 access token으로 교환하고 사용자 정보를 조회

### 2.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `KAKAO_REST_API_KEY` | Kakao Developers 앱의 REST API Key |
| `KAKAO_CLIENT_SECRET` | Client Secret을 사용하는 경우 설정 |
| `KAKAO_REDIRECT_URI` | 프론트/백엔드 카카오 콜백 URI |
| `KAKAO_SCOPE` | `account_email,profile_nickname,profile_image` |
| `KAKAO_AUTH_BASE_URL` | 기본값 `https://kauth.kakao.com` |
| `KAKAO_API_BASE_URL` | 기본값 `https://kapi.kakao.com` |

### 2.3 설정 파일

- `services/auth/src/main/resources/application-local.yaml`
- `infra/docker-compose/server4-auth.yml`

## 3. KakaoPay

### 3.1 사용 목적

- 예매 결제 준비/승인/실패/취소 처리
- 취소표 구매 시 카카오페이 결제 리다이렉트 처리

### 3.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `KAKAOPAY_BASE_URL` | 카카오페이 Open API URL, 기본 `https://open-api.kakaopay.com` |
| `KAKAOPAY_SECRET_KEY` | 카카오페이 Open API Secret Key |
| `KAKAOPAY_CID` | 테스트 기본값 `TC0ONETIME` |
| `KAKAOPAY_APPROVAL_URL` | 승인 callback URL |
| `KAKAOPAY_FAIL_URL` | 실패 callback URL |
| `KAKAOPAY_CANCEL_URL` | 취소 callback URL |
| `KAKAOPAY_SUCCESS_REDIRECT_URL` | 승인 후 FE 이동 URL |
| `KAKAOPAY_FAILED_REDIRECT_URL` | 실패 후 FE 이동 URL |
| `KAKAOPAY_CANCELLED_REDIRECT_URL` | 취소 후 FE 이동 URL |

### 3.3 설정 파일

- `services/be/src/main/resources/application-local.yaml`
- `infra/docker-compose/server1-main.yml`
- `.env.example`

## 4. CoolSMS

### 4.1 사용 목적

- Auth 서버의 휴대폰 인증번호 발송
- Core BE의 취소표 문자 알림 발송

### 4.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `COOLSMS_API_KEY` | CoolSMS API Key |
| `COOLSMS_API_SECRET` | CoolSMS API Secret |
| `COOLSMS_SENDER_NUMBER` | 승인된 발신번호 |

### 4.3 설정 파일

- `services/be/src/main/resources/application-local.yaml`
- `services/auth/src/main/resources/application-local.yaml`
- `infra/docker-compose/server1-main.yml`
- `infra/docker-compose/server4-auth.yml`

## 5. AWS S3

### 5.1 사용 목적

- 사용자 프로필 이미지 업로드/삭제
- 이벤트 포스터 및 소개 이미지 업로드

### 5.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `AWS_S3_BUCKET` | S3 버킷명 |
| `AWS_REGION` | AWS Region, 기본 `ap-northeast-2` |
| `AWS_ACCESS_KEY` | AWS Access Key |
| `AWS_SECRET_KEY` | AWS Secret Key |

### 5.3 설정 파일

- `services/be/src/main/resources/application-local.yaml`
- `infra/docker-compose/server1-main.yml`

## 6. Cloudflare Turnstile

### 6.1 사용 목적

- 봇 탐지/캡차 검증
- BE에서 Cloudflare `siteverify` API를 호출해 FE에서 전달된 Turnstile token을 검증

### 6.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | BE 서버의 Turnstile token 검증용 Secret Key |

### 6.3 설정 파일

- `services/be/src/main/resources/application-local.yaml`
- `infra/docker-compose/server1-main.yml`

## 7. AI 내부 서버

### 7.1 사용 목적

- Core BE의 AI inference callback 및 내부 AI 연동
- 현재 설정상 `AI_INTERNAL_URL`로 내부 API URL 주입

### 7.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `AI_INTERNAL_URL` | AI 서버 내부 접근 URL |

### 7.3 설정 파일

- `services/be/src/main/resources/application-local.yaml`
- `infra/docker-compose/server1-main.yml`
- `services/be/.env.example`

## 8. GitLab, GitLab Container Registry

### 8.1 사용 목적

- 소스 코드 저장소
- Jenkins checkout
- Auth Docker image push/pull

### 8.2 필요 정보

| 항목 | 설명 |
|------|------|
| GitLab Repository URL | `git clone` 및 Jenkins SCM 설정에 사용 |
| GitLab 계정 | 소스 pull 권한 필요 |
| `gitlab-credentials` | Jenkins credential ID, registry login에 사용 |
| `REGISTRY` | GitLab Container Registry 주소 |

### 8.3 설정 파일

- `Jenkinsfile`

## 9. Jenkins

### 9.1 사용 목적

- GitLab 변경사항 감지
- BE/Auth 자동 빌드 및 배포
- Mattermost 배포 알림

### 9.2 필요 정보

| 항목 | 설명 |
|------|------|
| `gitlab-credentials` | GitLab 접근 및 Registry 로그인용 Jenkins credential |
| `tickle-deploy-key` | 배포 서버 SSH 접속용 Jenkins credential |
| `SERVER1_IP` | Core BE 배포 서버 접속 IP |
| `SERVER4_IP` | Auth 배포 서버 접속 IP |
| `REGISTRY` | GitLab Container Registry 주소 |
| `Jenkinsfile` | Pipeline 정의 파일 |

### 9.3 설정 파일

- `infra/docker-compose/server5-jenkins.yml`
- `Jenkinsfile`

## 10. Gradle/Maven Central

### 10.1 사용 목적

- Spring Boot, Spring Kafka, Redisson, JJWT, AWS SDK, CoolSMS SDK 등 Java dependency 다운로드

### 10.2 필요 정보

- 별도 가입 불필요
- 빌드 환경에서 `https://repo.maven.apache.org/maven2` 및 Gradle distribution 다운로드 URL 접근 필요

### 10.3 설정 파일

- `services/be/build.gradle`
- `services/auth/build.gradle`
- `services/be/gradle/wrapper/gradle-wrapper.properties`
- `services/auth/gradle/wrapper/gradle-wrapper.properties`

## 11. Mattermost Webhook

### 11.1 사용 목적

- Jenkins 배포 성공/실패 알림

### 11.2 필요 정보

| 항목 | 설명 |
|------|------|
| `MATTERMOST_WEBHOOK` | Jenkins 배포 결과 알림을 보낼 Incoming Webhook URL |
| `Jenkinsfile` | 현재 Webhook URL이 environment로 정의된 파일 |


## 12. 비밀값 관리 원칙

- 제출 문서에는 실제 키 값을 적지 않고 변수명과 설정 위치만 기록합니다.
- 키가 노출된 경우 즉시 외부 서비스 콘솔에서 재발급하고 기존 키를 폐기합니다.
