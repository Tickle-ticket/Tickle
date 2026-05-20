// =============================================================
// 01_queue_enter.js — 대기열 진입 부하 테스트
//
// 시나리오 목적:
//   POST /api/v1/queues/{eventId}/enter 와 GET /token의 P95 응답시간 / 처리량을 측정한다.
//   병목 분석상 enter API는 Kafka send().get() 동기 ack로 hot-path가 직렬화되므로
//   동시성에 따른 latency 증가가 가장 잘 드러난다. Kafka consumer 부재로 실제
//   WAITING ZSet 등록은 /token 핸들러에서 일어나므로 enter → token 순서까지 함께 측정한다.
//
// 측정 지표:
//   - http_req_duration{endpoint:queue_enter}  : enter 응답시간
//   - http_req_duration{endpoint:queue_token}  : token 응답시간
//   - queue_enter_latency (Trend)              : enter 별도 trend
//   - queue_token_latency (Trend)              : token 별도 trend
//   - http_req_failed                          : 전체 실패율
//
// 사전 준비:
//   - EventOpenInfo 캐시가 Redis에 적재된 TEST_EVENT_ID
//   - 로그인 가능한 TEST_USER_EMAIL/PASSWORD
// =============================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

import { setupAuth, authHeaders, requireEnv } from "./helpers/auth.js";

const queueEnterLatency = new Trend("queue_enter_latency", true);
const queueTokenLatency = new Trend("queue_token_latency", true);

// STAGE 환경변수로 실행할 시나리오를 선택한다. 미설정 시 smoke만 실행.
// 사용: k6 run --env STAGE=load scenarios/01_queue_enter.js
const STAGE = __ENV.STAGE || "smoke";

const ALL_SCENARIOS = {
  smoke: {
    executor: "constant-vus",
    vus: 10,
    duration: "1m",
    tags: { stage: "smoke" },
    exec: "queueEnterFlow",
  },
  load: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "1m", target: 100 },
      { duration: "2m", target: 300 },
      { duration: "2m", target: 500 },
      { duration: "1m", target: 0 },
    ],
    tags: { stage: "load" },
    exec: "queueEnterFlow",
  },
  stress: {
    executor: "constant-vus",
    vus: 1000,
    duration: "3m",
    tags: { stage: "stress" },
    exec: "queueEnterFlow",
  },
};

const selectedScenarios =
  STAGE === "all"
    ? ALL_SCENARIOS
    : { [STAGE]: ALL_SCENARIOS[STAGE] || ALL_SCENARIOS.smoke };

export const options = {
  scenarios: selectedScenarios,
  thresholds: {
    "http_req_duration{endpoint:queue_enter}": ["p(95)<300"],
    "http_req_duration{endpoint:queue_token}": ["p(95)<300"],
    "http_req_failed": ["rate<0.005"],
    "queue_enter_latency": ["p(95)<300"],
    "queue_token_latency": ["p(95)<300"],
  },
};

/**
 * setup: 모든 VU가 공유할 accessToken 발급.
 */
export function setup() {
  return setupAuth();
}

/**
 * 메인 시나리오:
 *   1) POST /api/v1/queues/{eventId}/enter → requestId
 *   2) GET  /api/v1/queues/{eventId}/token?requestId=... → queueToken
 *
 * 참고: enter는 멱등하므로 동일 user가 반복 호출해도 동일 requestId가 반환된다.
 *       k6 부하에서는 단일 계정 + 멱등 응답 특성을 이용해 부하만 측정한다.
 */
export function queueEnterFlow(data) {
  const baseUrl = requireEnv("BASE_URL");
  const eventId = requireEnv("TEST_EVENT_ID");
  const headers = authHeaders(data.accessToken);

  // 1) enter
  const enterRes = http.post(
    `${baseUrl}/api/v1/queues/${eventId}/enter?scope=BOOKING`,
    "",
    { headers, tags: { endpoint: "queue_enter" } }
  );
  queueEnterLatency.add(enterRes.timings.duration);

  const enterOk = check(enterRes, {
    "enter 201": (r) => r.status === 201,
    "enter has requestId": (r) => {
      try {
        return typeof r.json("data.requestId") === "string";
      } catch (e) {
        return false;
      }
    },
  });

  if (!enterOk) {
    // 실패 시 token 단계 진행하지 않음 — 명시적으로 에러 응답을 검증한다.
    check(enterRes, {
      "enter not 5xx": (r) => r.status < 500,
    });
    sleep(1);
    return;
  }

  const requestId = enterRes.json("data.requestId");

  // 2) token
  const tokenRes = http.get(
    `${baseUrl}/api/v1/queues/${eventId}/token?scope=BOOKING&requestId=${encodeURIComponent(requestId)}`,
    { headers, tags: { endpoint: "queue_token" } }
  );
  queueTokenLatency.add(tokenRes.timings.duration);

  check(tokenRes, {
    "token 200": (r) => r.status === 200,
    "token has queueToken": (r) => {
      try {
        return typeof r.json("data.queueToken") === "string";
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}

/**
 * default export — k6는 시나리오에 exec가 명시되면 default를 호출하지 않지만,
 * 단일 시나리오 실행 시 fallback 용도로 정의해둔다.
 */
export default function (data) {
  queueEnterFlow(data);
}
