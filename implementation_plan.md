# Implementation Plan: Kakao OAuth JWT

## Scope
- `GET /api/v1/auth/kakao`: Kakao authorization endpoint로 302 redirect.
- `GET /api/v1/auth/kakao/callback`: authorization code를 Kakao token으로 교환하고 사용자 정보를 조회한 뒤 Tickle JWT access/refresh token 발급.
- 기존 269 회원가입 변경사항 위에서 OAuth 사용자 생성 흐름을 확장한다.

## Proposed Changes

### 1. OAuth Configuration
- `services/auth/src/main/resources/application-local.yaml`
  - Kakao REST API key, client secret, redirect URI, scope, authorize/token/user-info base URL 환경변수 추가.
- `services/auth/src/main/java/com/ssafy/tickle/auth/common/config/RestClientConfig.java`
  - Kakao auth/api RestClient Bean 추가.
- `services/auth/src/main/java/com/ssafy/tickle/auth/common/config/SecurityConfig.java`
  - `/api/v1/auth/kakao`, `/api/v1/auth/kakao/callback` 공개 엔드포인트 허용.

### 2. Auth Domain Persistence
- `AuthUser`
  - OAuth 사용자를 저장할 provider/providerUserId 필드 추가.
  - OAuth 사용자는 password/phoneNumber가 없을 수 있으므로 nullable 허용.
  - 로컬 가입은 provider `LOCAL`, 카카오는 provider `KAKAO`.
- `AuthUserRepository`
  - provider + providerUserId 조회 메서드 추가.

### 3. Kakao Client
- 신규 `KakaoOAuthClient`
  - authorize URL 생성.
  - code로 Kakao access token 요청.
  - Kakao access token으로 사용자 정보 조회.
- 신규 DTO
  - Kakao token/user-info 응답 record.

### 4. OAuth Application Flow
- `AuthService`
  - Kakao authorize URL 반환.
  - callback code 처리: Kakao 사용자 조회 → 기존 OAuth 사용자면 토큰 발급 → 신규면 Auth DB 저장 + BE 내부 사용자 생성 + 토큰 발급.
  - 같은 이메일의 로컬 계정이 이미 있으면 중복 이메일 예외로 차단.
- `BeInternalClient`
  - 기존 createUser 재사용.

### 5. Presentation and API Docs
- `AuthController`, `AuthApiDoc`
  - Kakao login redirect endpoint.
  - Kakao callback endpoint.
  - Swagger response/error 설명 추가.

### 6. Tests
- `AuthServiceTest`
  - Kakao 기존 사용자 로그인.
  - Kakao 신규 사용자 가입 후 토큰 발급.
  - Kakao 이메일 중복 예외.
  - Kakao BE 내부 생성 실패 롤백 예외.
- 가능하면 client URL 생성 단위 테스트 추가.

## Commit Plan
1. `[BE] 279 docs: 카카오 OAuth 구현 계획 작성`
2. `[BE] 279 feat: 카카오 OAuth 클라이언트 구성`
3. `[BE] 279 feat: 카카오 로그인 JWT 발급 구현`
4. `[BE] 279 test: 카카오 OAuth 인증 테스트 추가`
