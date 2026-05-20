# Tickle 성능 테스트 (k6)

티켓팅 핵심 경로(대기열 진입/SSE/좌석 선점/전체 플로우)의 부하 테스트 스크립트입니다.

## 1. 사전 준비

### 1-1. k6 설치

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

`k6 version` 으로 설치 확인. v0.50 이상 권장 (experimental-prometheus-rw output 안정화).

### 1-2. .env.perf 생성

```bash
cd services/be/performance-tests
cp .env.perf.example .env.perf
# .env.perf 편집 — 실제 BASE_URL/계정/이벤트ID/좌석ID/Prometheus URL 입력
```

### 1-3. 백엔드 사이드 사전 준비

병목 분석서(`_workspace/01_analyst_bottlenecks.md`)에 정리된 주의사항입니다.

- **EventOpenInfo 캐시 적재**: 새 공연이면 `EventOpenInfoScheduler`가 최대 60초 주기로 동작하므로
  테스트 시작 전 1분 대기. `HGETALL queue:event:{eventId}` 로 확인 가능.
- **테스트 계정**: `TEST_USER_EMAIL` 은 회원가입 + 휴대폰 인증까지 완료된 계정이어야 한다.
- **테스트 좌석**: `TEST_SEAT_IDS` 의 sessionSeat 들이 모두 AVAILABLE 상태여야 한다.
  반복 테스트 시 HOLD_MINUTES=15분이 지나기 전엔 재사용 불가 — 새 sessionSeat 로 교체하거나
  DB/Redis 초기화 필요.
- **Auth 서버**: `services/auth` 는 별도 JVM이므로 monitoring/metric 따로 확인.
- **Rate Limit 비적용**: `/api/v1/queues/**` 경로에는 IpRateLimitInterceptor가 동작하지 않으므로
  단일 IP에서 부하를 줘도 통과한다 (운영과는 다른 결과).

## 2. 실행

```bash
# 1) 대기열 진입 — 스모크
./run.sh 01_queue_enter smoke

# 2) SSE 동시 구독 — 200 VU 단계
./run.sh 02_queue_sse stage_200

# 3) 좌석 선점 동시성
./run.sh 03_seat_hold

# 4) 전체 플로우
./run.sh 04_full_flow
```

실행 결과는 `results/` 에 `summary.json` 으로 저장되고, `PROMETHEUS_REMOTE_WRITE_URL` 이 설정돼 있으면
실시간으로 Prometheus에 push 됩니다.

### 좌석 hold 시나리오 옵션

- `SEAT_HOLD_REQUIRE_ADMIT=false` (env): admitToken 없이 401 분포만 확인하는 모드.
- `PRE_ADMIT_TOKEN=<token>` (env): 사전에 발급받은 admitToken을 주입해 진짜 락 경합을 측정.

## 3. 시나리오 요약

| 파일 | 목적 | 측정 지표 | VU/Stage |
|------|------|-----------|----------|
| `01_queue_enter.js` | enter→token 처리량/지연 | `queue_enter_latency`, `queue_token_latency` | smoke(10), load(100→500), stress(1000) |
| `02_queue_sse.js` | 동시 SSE 구독 한계 | `sse_connect_latency`, `sse_event_received` | 50 / 200 / 500 단계적 |
| `03_seat_hold.js` | 동일 좌석 동시 요청 정합성 | `seat_hold_success` (정확히 1), `seat_hold_latency` | shared-iterations VU=100 iter=100 |
| `04_full_flow.js` | 엔드투엔드 완주율 | `flow_completed`, `flow_admitted`, `full_flow_duration` | VU=50, 5분 |

## 4. Grafana 대시보드

k6 공식 대시보드(Grafana.com Dashboard ID **2587**)를 사용합니다.

1. Grafana → Dashboards → **New → Import**
2. 입력란에 `2587` 입력 → **Load**
3. Prometheus 데이터소스(server3) 선택 → **Import**

추가로 보고 싶은 커스텀 메트릭 PromQL 예시는 `grafana/k6-dashboard.json` 참고.

연관 BE 메트릭(Tomcat threads, Redis ops, Kafka latency, JVM memory)을 같은 대시보드에 묶어
"k6 부하 시점의 BE 자원 사용"을 함께 보면 분석이 쉽습니다.

## 5. 디렉토리 구조

```
services/be/performance-tests/
├── .env.perf.example       # 환경변수 템플릿
├── .gitignore              # .env.perf, results/, *.csv 제외
├── run.sh                  # 실행 헬퍼 (env 로드 + k6 호출)
├── README.md               # 이 파일
├── scenarios/
│   ├── helpers/auth.js     # login() + authHeaders() 공통 헬퍼
│   ├── 01_queue_enter.js
│   ├── 02_queue_sse.js
│   ├── 03_seat_hold.js
│   └── 04_full_flow.js
└── grafana/
    └── k6-dashboard.json   # import 안내 + 추천 PromQL
```

## 6. 트러블슈팅

- **`login failed: status=403`**: BE에 보안 정책으로 차단됐는지 확인 (Origin/Referer 등).
  로컬 테스트는 `BASE_URL=http://localhost:8080` 로 변경.
- **`enter 4xx` 다발**: EventOpenInfo 캐시가 비어있을 가능성. Redis에서 `queue:event:*` 확인.
- **`hold 401` 100%**: admitToken 미주입이 정상. `PRE_ADMIT_TOKEN` 설정 시 진짜 락 경합 측정.
- **SSE 응답이 항상 빈 문자열**: k6 timeout 안에 첫 push가 도착하지 못한 경우.
  `QueueSseHandler.SSE_PUSH_DELAY_MS` 와 timeout 값을 비교해 조정.
- **`experimental-prometheus-rw` output 에러**: k6 0.46 이하라면 업그레이드 필요.
