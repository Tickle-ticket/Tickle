// =============================================================
// 02_queue_sse.js — SSE 동시 구독 부하 테스트
//
// 시나리오 목적:
//   GET /api/v1/queues/{eventId}/stream 의 동시 연결 한계와 push 주기 일관성을 측정한다.
//   QueueSseHandler가 ConcurrentHashMap을 단일 스레드로 직렬 순회하며 emitter당 Redis 4 RTT를
//   사용하므로 구독자 수가 늘면 push 지연이 누적된다. 또한 SSE_TIMEOUT_MILLIS=30분으로
//   Tomcat thread를 장시간 점유한다 (thread pool 기본 200 → 초과 시 thread 고갈).
//
// 측정 지표:
//   - sse_connect_latency (Trend) : 최초 연결 + 첫 청크 수신까지 시간
//   - sse_event_received (Rate)   : ADMITTED/WAITING 이벤트 수신 여부
//   - http_req_duration{endpoint:queue_sse}
//
// 구현 노트:
//   k6의 experimental/streams는 아직 불안정하므로 http.get을 사용해
//   chunked 응답이 닫힐 때까지 timeout으로 잡고, 응답 body에서 event 라인을 파싱한다.
//   timeout(30s) 동안 받은 누적 응답을 검사한다.
// =============================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

import { setupAuth, authHeaders, requireEnv } from "./helpers/auth.js";

// sse_hold_duration: SSE 연결이 유지된 총 시간(~30s timeout). 최초 연결 지연이 아님.
// k6 표준 http 모듈은 스트리밍을 지원하지 않아 TTFB 측정 불가 — 30s hold 후 일괄 반환.
const sseHoldDuration = new Trend("sse_hold_duration", true);
const sseEventReceived = new Rate("sse_event_received");

// STAGE 환경변수로 실행할 시나리오를 선택한다.
// 사용: k6 run --env STAGE=stage_200 scenarios/02_queue_sse.js
// 값: stage_50 | stage_200 | stage_500 | all (미설정 시 stage_50)
const STAGE = __ENV.STAGE || "stage_50";

const ALL_SCENARIOS = {
  stage_50: {
    executor: "constant-vus",
    vus: 50,
    duration: "2m",
    tags: { stage: "sse_50" },
    exec: "sseFlow",
  },
  stage_200: {
    executor: "constant-vus",
    vus: 200,
    duration: "2m",
    tags: { stage: "sse_200" },
    exec: "sseFlow",
  },
  stage_500: {
    executor: "constant-vus",
    vus: 500,
    duration: "2m",
    tags: { stage: "sse_500" },
    exec: "sseFlow",
  },
};

// all이면 순차 실행 (50→200→500)을 위해 startTime 추가
const ALL_SEQUENTIAL = {
  stage_50: { ...ALL_SCENARIOS.stage_50 },
  stage_200: { ...ALL_SCENARIOS.stage_200, startTime: "2m30s" },
  stage_500: { ...ALL_SCENARIOS.stage_500, startTime: "5m" },
};

const selectedScenarios =
  STAGE === "all"
    ? ALL_SEQUENTIAL
    : { [STAGE]: ALL_SCENARIOS[STAGE] || ALL_SCENARIOS.stage_50 };

export const options = {
  scenarios: selectedScenarios,
  thresholds: {
    "http_req_duration{endpoint:queue_enter}": ["p(95)<500"],
    "http_req_duration{endpoint:queue_token}": ["p(95)<500"],
    // sse_hold_duration은 SSE 연결 총 유지시간(~30s)이므로 threshold 미설정
    // http_req_failed{endpoint:queue_sse} 미포함 — 30s timeout은 k6가 status=0으로
    // 처리해 항상 "failed"로 집계됨. responseCallback으로 status=0 허용.
    "sse_event_received": ["rate>0.95"],       // 95% 이상 이벤트 수신 성공 (★ 핵심)
  },
};

export function setup() {
  return setupAuth();
}

/**
 * enter → token → SSE stream 30초 구독.
 * SSE는 timeout=30s로 chunked 응답을 받고 종료 후 누적 body에서 event 발생 여부를 확인한다.
 *
 * 주의: 응답 텍스트에 'data:' 라인이 1개 이상이면 event 수신 성공으로 본다.
 *      대기열 길이가 짧을 경우 ADMITTED가, 길 경우 WAITING이 들어온다.
 */
export function sseFlow(data) {
  const baseUrl = requireEnv("BASE_URL");
  const eventId = requireEnv("TEST_EVENT_ID");
  const headers = authHeaders(data.accessToken);

  // 1) enter
  const enterRes = http.post(
    `${baseUrl}/api/v1/queues/${eventId}/enter?scope=BOOKING`,
    "",
    { headers, tags: { endpoint: "queue_enter" } }
  );
  if (!check(enterRes, { "enter 201": (r) => r.status === 201 })) {
    return;
  }
  const requestId = enterRes.json("data.requestId");

  // 2) token
  const tokenRes = http.get(
    `${baseUrl}/api/v1/queues/${eventId}/token?scope=BOOKING&requestId=${encodeURIComponent(requestId)}`,
    { headers, tags: { endpoint: "queue_token" } }
  );
  if (!check(tokenRes, { "token 200": (r) => r.status === 200 })) {
    return;
  }
  const queueToken = tokenRes.json("data.queueToken");

  // 3) SSE stream — 30초 동안 chunked 응답 수신
  const sseHeaders = {
    Authorization: `Bearer ${data.accessToken}`,
    Accept: "text/event-stream",
    "Cache-Control": "no-cache",
  };
  const start = Date.now();
  // responseCallback으로 status=0 (30s timeout 종료)을 정상으로 표시해
  // http_req_failed가 잘못 집계되지 않도록 한다.
  const sseRes = http.get(
    `${baseUrl}/api/v1/queues/${eventId}/stream?scope=BOOKING&queueToken=${encodeURIComponent(queueToken)}`,
    {
      headers: sseHeaders,
      timeout: "30s",
      tags: { endpoint: "queue_sse" },
      responseCallback: http.expectedStatuses({ min: 0, max: 0 }, 200),
    }
  );
  const elapsed = Date.now() - start;

  sseHoldDuration.add(elapsed);

  // timeout으로 끊어지면 status가 0이 될 수도 있다. body는 누적된 청크.
  const bodyText = typeof sseRes.body === "string" ? sseRes.body : "";
  const hasEvent =
    bodyText.includes("data:") ||
    bodyText.includes("event:") ||
    bodyText.includes("ADMITTED") ||
    bodyText.includes("WAITING");

  sseEventReceived.add(hasEvent);

  check(sseRes, {
    "sse connection accepted": (r) => r.status === 200 || r.status === 0,
    "sse received at least one event": () => hasEvent,
  });

  // leave 처리 — 다음 VU iteration을 위해 토큰 정리
  http.post(
    `${baseUrl}/api/v1/queues/${eventId}/leave?scope=BOOKING&queueToken=${encodeURIComponent(queueToken)}`,
    "",
    { headers, tags: { endpoint: "queue_leave" } }
  );

  sleep(1);
}

export default function (data) {
  sseFlow(data);
}
