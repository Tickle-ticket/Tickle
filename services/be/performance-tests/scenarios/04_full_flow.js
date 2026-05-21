// =============================================================
// 04_full_flow.js — 전체 사용자 플로우 (실사용 시나리오 재현)
//
// 시나리오 목적:
//   로그인 → enter → token → SSE 구독 → (ADMITTED 수신 시) seats/hold 까지
//   엔드투엔드 완주율과 단계별 latency를 측정한다.
//   각 단계별 think time을 포함해 실제 사용자 페이스를 모사한다.
//
// 측정 지표:
//   - http_req_duration (단계별 endpoint 태그)
//   - flow_completed (Rate)       : 전체 플로우 완주 (hold 진입까지) 비율
//   - flow_admitted (Rate)        : SSE에서 ADMITTED 수신 비율
//   - full_flow_duration (Trend)  : login~hold 전체 wall time
// =============================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

import { login, authHeaders, requireEnv } from "./helpers/auth.js";

const flowCompleted = new Rate("flow_completed");
const flowAdmitted = new Rate("flow_admitted");
const fullFlowDuration = new Trend("full_flow_duration", true);

export const options = {
  scenarios: {
    full_flow: {
      executor: "constant-vus",
      vus: 50,
      duration: "5m",
      tags: { stage: "full_flow" },
    },
  },
  thresholds: {
    "http_req_failed": ["rate<0.05"],
    "http_req_duration{endpoint:queue_enter}": ["p(95)<500"],
    "http_req_duration{endpoint:queue_token}": ["p(95)<500"],
  },
};

/**
 * 각 VU iteration마다 신선한 access token으로 로그인 후 전체 플로우를 실행한다.
 * (대기열 큐가 user 단위이므로 동일 계정 반복 호출은 멱등 — 부하 측정에는 충분하나
 *  실제 사용자 다양성을 보고 싶다면 csv로 다수 계정을 주입하도록 확장.)
 */
export default function () {
  const baseUrl = requireEnv("BASE_URL");
  const eventId = requireEnv("TEST_EVENT_ID");
  const scheduleId = requireEnv("TEST_SCHEDULE_ID");
  const seatIdsRaw = requireEnv("TEST_SEAT_IDS");
  const seatIds = seatIdsRaw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n))
    .slice(0, 4);

  const flowStart = Date.now();

  // 1) login
  const accessToken = login();
  const headers = authHeaders(accessToken);

  sleep(1); // 사용자가 페이지 열고 입장 버튼 누르는 시간

  // 2) enter
  const enterRes = http.post(
    `${baseUrl}/api/v1/queues/${eventId}/enter?scope=BOOKING`,
    "",
    { headers, tags: { endpoint: "queue_enter" } }
  );
  const enterOk = check(enterRes, {
    "enter 201": (r) => r.status === 201,
  });
  if (!enterOk) {
    flowCompleted.add(false);
    flowAdmitted.add(false);
    return;
  }
  const requestId = enterRes.json("data.requestId");

  // 3) token
  const tokenRes = http.get(
    `${baseUrl}/api/v1/queues/${eventId}/token?scope=BOOKING&requestId=${encodeURIComponent(requestId)}`,
    { headers, tags: { endpoint: "queue_token" } }
  );
  const tokenOk = check(tokenRes, {
    "token 200": (r) => r.status === 200,
  });
  if (!tokenOk) {
    flowCompleted.add(false);
    flowAdmitted.add(false);
    return;
  }
  const queueToken = tokenRes.json("data.queueToken");

  sleep(1);

  // 4) SSE stream — 최대 20초까지 대기, ADMITTED 받으면 admitToken 추출
  const sseHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "text/event-stream",
  };
  const sseRes = http.get(
    `${baseUrl}/api/v1/queues/${eventId}/stream?scope=BOOKING&queueToken=${encodeURIComponent(queueToken)}`,
    {
      headers: sseHeaders,
      timeout: "20s",
      tags: { endpoint: "queue_sse" },
    }
  );

  const sseBody = typeof sseRes.body === "string" ? sseRes.body : "";
  const admitted = sseBody.includes("ADMITTED");
  flowAdmitted.add(admitted);

  // admitToken 파싱 — 안전한 정규식 사용
  let admitToken = null;
  if (admitted) {
    const m = sseBody.match(/"admitToken"\s*:\s*"([^"]+)"/);
    if (m) {
      admitToken = m[1];
    }
  }

  if (!admitToken) {
    // 대기열이 길어 admission 못 받은 경우 — 완주 실패로 분류하되 정상 케이스
    flowCompleted.add(false);

    // leave 정리
    http.post(
      `${baseUrl}/api/v1/queues/${eventId}/leave?scope=BOOKING&queueToken=${encodeURIComponent(queueToken)}`,
      "",
      { headers, tags: { endpoint: "queue_leave" } }
    );
    return;
  }

  sleep(1);

  // 5) seats/hold
  const holdPayload = JSON.stringify({ sessionSeatIds: seatIds });
  const holdRes = http.post(
    `${baseUrl}/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold?admitToken=${encodeURIComponent(admitToken)}`,
    holdPayload,
    { headers, tags: { endpoint: "seat_hold" } }
  );

  const holdOk = check(holdRes, {
    "hold 200 or contention": (r) => r.status === 200 || r.status === 409,
  });

  flowCompleted.add(holdOk);
  fullFlowDuration.add(Date.now() - flowStart);

  // 정리 — 좌석 release + queue leave
  http.del(
    `${baseUrl}/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold`,
    null,
    { headers, tags: { endpoint: "seat_release" } }
  );
  http.post(
    `${baseUrl}/api/v1/queues/${eventId}/leave?scope=BOOKING&queueToken=${encodeURIComponent(queueToken)}`,
    "",
    { headers, tags: { endpoint: "queue_leave" } }
  );

  sleep(1);
}
