@docs/git-convention.md
@docs/code-convention.md

# Tickle - 티켓팅 서비스 백엔드

## 프로젝트 개요
대용량 트래픽을 처리하는 티켓팅 플랫폼. 대기열(Kafka+SSE), 좌석 선점(Redis 분산락), 실시간 동기화(WebSocket), 취소표 재배분(CoolSMS) 기능을 포함한다.

## 작업 디렉토리
백엔드 작업은 항상 `services/be` 기준으로 진행한다.

## 기술 스택
- **Spring Boot 3.4.5** / Java 21 / Gradle
- **MySQL** — 메인 DB
- **Redis (Redisson 3.49.0)** — 분산락, 캐시, 토큰 저장
- **Kafka** — 비동기 메시징 (대기열, 취소 이벤트)
- **WebSocket** — 실시간 좌석 동기화
- **SSE** — 대기열 순번 실시간 Push
- **Prometheus + Tempo** — 모니터링/트레이싱

> **아직 build.gradle에 없는 의존성** (auth 작업 전 추가 필요):
> - `spring-boot-starter-security`
> - JWT 라이브러리 (`jjwt` 또는 `nimbus-jose-jwt`)

## 패키지 구조
```
com.ssafy.tickle
├── common/
│   ├── config/          # JacksonConfig, RedissonConfig, {Domain}CacheConfig 등
│   ├── exception/       # BaseException, GlobalExceptionHandler
│   │   └── code/        # ErrorCode(interface), GlobalErrorCode, SuccessCode
│   ├── response/        # BaseResponse<T> (record)
│   └── util/            # RedisLockManager
├── {domain}/            # event, queue, user, seat, reservation, cancellation, payment, venue, favorite, auth(미생성)
│   ├── domain/          # Entity (Inner Enum, Inner Record 포함)
│   ├── infrastructure/
│   │   ├── persistence/ # JpaRepository, CustomRepo, Impl
│   │   ├── cache/       # model(Cached*), mapper, store
│   │   └── messaging/   # model(*Message), mapper, producer
│   ├── application/     # Service, Scheduler
│   └── presentation/    # Controller, ApiDoc(interface), dto/
```

## 코드 컨벤션 핵심 요약
> 상세 규칙은 `docs/code-convention.md` 참고

- **응답**: `ResponseEntity.ok().body(BaseResponse.success(data))`
- **예외**: `throw new BaseException(DomainErrorCode.XXX)` — GlobalExceptionHandler가 처리
- **시간**: `Instant` 사용 (LocalDateTime 금지)
- **금액**: `BigDecimal` (precision=18, scale=2)
- **Enum**: 엔티티 Inner Enum, DB는 `@Enumerated(EnumType.STRING)`
- **JPA Cascade**: 사용 금지. DB 레벨 필요시 `@OnDelete(action = OnDeleteAction.CASCADE)`
- **Fetch**: 모든 관계 `FetchType.LAZY`, N+1은 `@EntityGraph` 또는 QueryDSL로 해결
- **Transaction**: 서비스 클래스 레벨 `@Transactional(readOnly = true)`, 쓰기는 메서드에 `@Transactional` 오버라이드
- **Redis Cache**: CacheStore에서 SerializationException/DataAccessException 반드시 try-catch + warn 로그
- **Kafka Producer**: 중요 경로는 `kafkaTemplate.send(...).get()`으로 ack 확인
- **분산락**: `common/util/RedisLockManager` 사용

## 도메인 현황
| 도메인 | 상태 | 담당 |
|--------|------|------|
| event | ✅ 완료 | 양희령 |
| queue | ✅ 완료 | 양희령 |
| user | 🔧 기본 완료 | 양희령 |
| favorite | 🔧 기본 완료 | 양희령 |
| venue | 🏗 domain/repo만 | - |
| seat | 🏗 domain/repo만 | 정정교 |
| reservation | 🏗 domain/repo만 | 정정교 |
| cancellation | 🏗 domain/repo만 | 정정교 |
| payment | 🏗 domain/repo만 | 양희령 |
| **auth** | ❌ 미생성 | **정정교** |

## 정정교 스프린트 작업 (SP3 → SP4)

### SP3 (현재 진행)
1. **[auth]** 자체 회원가입 — `POST /api/v1/auth/signup`
2. **[auth]** 자체 로그인 + JWT 발급 — `POST /api/v1/auth/login`
3. **[auth]** 로그아웃 (Redis 토큰 폐기) — `POST /api/v1/auth/logout`
4. **[auth]** 액세스 토큰 재발급 — `POST /api/v1/auth/reissue`
5. **[seat]** 좌석 배치도 조회 — `GET /api/v1/events/{eventId}/schedules/{scheduleId}/seats`
6. **[seat]** Redis 분산락 좌석 선점 (All-or-Nothing) — `POST .../seats/hold`
7. **[seat]** 좌석 선점 해제 — `DELETE .../seats/hold`
8. **[seat]** WebSocket 실시간 좌석 동기화 — `WS /ws/seats/{scheduleId}`
9. **[reservation]** 예매 내역 목록 조회 — `GET /api/v1/reservations`
10. **[reservation]** 예매 상세 조회 — `GET /api/v1/reservations/{reservationId}`
11. **[reservation]** 예매 취소 + Kafka 이벤트 발행 — `DELETE /api/v1/reservations/{reservationId}`

### SP4
1. **[auth]** 카카오 OAuth 로그인/콜백 + JWT 발급
2. **[cancellation]** 취소표 상세 조회
3. **[cancellation]** 취소표 구매 (무통장 입금, 10분 타이머)
4. **[cancellation]** CoolSMS 취소표 문자 알림 발송
5. **[admin]** 봇 탐지 현황, 대기열 상태, 블랙리스트 CRUD

## 환경 변수
`application-local.yaml`은 환경변수로 구성된다. 로컬 실행 시 `.env.example` 참고해서 환경변수 세팅 필요.
주요 변수: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `KAFKA_BOOTSTRAP_SERVERS`, `SERVER_PORT`

## ERD 참고
`docs/erd.md` — tickle_core 전체 테이블 구조 (2026-04-28 최신화)

주요 특이사항:
- `users`: oauth_provider 없음, nickname NOT NULL, profileImgUrl nullable, deleted_at 없음
- `event_seats`: event_price_policy_id FK 추가됨 (session_seats에서 이동)
- `bookings`: booked_at → created_at 변경
- `booking_ticket_status_histories`: booking_id → booking_ticket_id FK 변경

## 인프라 참고
- `infra/docker-compose/` — 서버별 docker-compose 파일 (server1~5)
- `infra/redis/` — Redis 설정
- `Jenkinsfile` — CI/CD 파이프라인

## Claude Code + Notion MCP 설정

ADR 문서를 Claude Code에서 직접 Notion에 작성할 수 있다.

### 최초 1회 설정 (팀원 각자)

1. **Node.js 설치 확인** (npx 필요)
   ```bash
   node -v  # v18 이상 권장
   ```

2. **Claude Code CLI 설치**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

3. **Notion 토큰을 쉘 환경변수로 등록** — 토큰은 팀 내부 채널에서 공유
   ```bash
   # ~/.zshrc 또는 ~/.bashrc에 추가
   export OPENAPI_MCP_HEADERS='{"Authorization":"Bearer 여기에_토큰_입력","Notion-Version":"2022-06-28"}'
   ```
   저장 후 `source ~/.zshrc` 실행

4. **프로젝트 루트에서 Claude Code 실행** — `.claude/settings.json`이 자동 로드되어 Notion MCP가 활성화됨
   ```bash
   claude
   ```

5. **Notion 페이지 권한 추가** — ADR 페이지 및 API 명세서 페이지에서 `···` → `Connect to` → `Claude Code` Integration 선택

> ⚠️ 토큰을 코드에 직접 넣지 말 것. `settings.local.json`도 gitignore 처리되어 있으나 토큰은 환경변수로만 관리.

### 사용법

Claude Code 채팅에서 자연어로 요청:
```
"auth 도메인 JWT 저장 방식 결정 ADR로 작성해줘"
"오늘 Redis 분산락 트러블슈팅 ADR-036으로 기록해줘"
```

> `.claude/settings.local.json`은 gitignore 처리되어 있으니 개인 설정은 자유롭게 사용 가능.
