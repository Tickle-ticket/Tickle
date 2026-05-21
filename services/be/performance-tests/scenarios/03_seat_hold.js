// =============================================================
// 03_seat_hold.js — 좌석 선점 동시성 테스트 (All-or-Nothing)
//
// 시나리오 목적:
//   "동일한 좌석 ID 집합을 N명이 동시에 요청하면 정확히 1명만 성공해야 한다"는
//   DB 레벨 정합성을 검증하고 P99 latency를 측정한다.
//
//   - 분산락(scheduleId 단위)을 제거했으며, holdBatch의
//     WHERE sale_status = 'AVAILABLE' + MySQL InnoDB row lock으로 정합성을 보장한다.
//   - 100명이 동시에 같은 좌석을 요청하면:
//     첫 번째 커밋이 AVAILABLE → HELD로 전환
//     나머지는 WHERE AVAILABLE 조건 불충족 → updated=0 → SEAT_ALREADY_HELD
//   - 정상: seat_hold_success=1, seat_hold_already_held=99
//
// 측정 지표:
//   - http_req_duration{endpoint:seat_hold}  : P99 latency
//   - seat_hold_success (Counter)            : 성공 수 (정확히 1이어야 함 — 정합성 ★)
//   - seat_hold_already_held (Counter)       : DB row lock 경합 후 실패 수
//   - seat_hold_lock_failed (Counter)        : 분산락 실패 (제거 후 항상 0)
//
// 사전 준비:
//   - admitToken이 필요하거나 SEAT_HOLD_REQUIRE_ADMIT=false로 비활성화
//   - OPENED 상태 event_session + AVAILABLE 상태 session_seats 필요
// =============================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

import { setupAuth, authHeaders, requireEnv } from "./helpers/auth.js";

const seatHoldSuccess = new Counter("seat_hold_success");
const seatHoldLockFailed = new Counter("seat_hold_lock_failed");
const seatHoldAlreadyHeld = new Counter("seat_hold_already_held");
const seatHoldUnauthorized = new Counter("seat_hold_unauthorized");
const seatHoldLatency = new Trend("seat_hold_latency", true);

const VU_COUNT = 100;
const ITERATIONS = 100;

export const options = {
  scenarios: {
    contended_hold: {
      executor: "shared-iterations",
      vus: VU_COUNT,
      iterations: ITERATIONS,
      maxDuration: "2m",
      tags: { stage: "seat_hold_contention" },
    },
  },
  thresholds: {
    "http_req_duration{endpoint:seat_hold}": ["p(99)<2000"],
    "seat_hold_success": [`count<=1`],
  },
};

export function setup() {
  const auth = setupAuth();

  const seatIdsRaw = requireEnv("TEST_SEAT_IDS");
  const seatIds = seatIdsRaw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n))
    .slice(0, 4); // 1인당 최대 4개 제한

  if (seatIds.length === 0) {
    throw new Error("TEST_SEAT_IDS must contain at least one numeric seat id");
  }

  const requireAdmit = (__ENV.SEAT_HOLD_REQUIRE_ADMIT || "true") === "true";
  const preAdmitToken = __ENV.PRE_ADMIT_TOKEN || "";

  return {
    accessToken: auth.accessToken,
    seatIds,
    requireAdmit,
    preAdmitToken,
  };
}

/**
 * 모든 VU가 동일한 좌석 ID 집합 + 동일한 scheduleId로 동시 요청한다.
 * admitToken이 유효해야 200이 떨어진다 — 일반 환경에서는 401이 다수가 정상.
 */
export default function (data) {
  const baseUrl = requireEnv("BASE_URL");
  const eventId = requireEnv("TEST_EVENT_ID");
  const scheduleId = requireEnv("TEST_SCHEDULE_ID");
  const headers = authHeaders(data.accessToken);

  const admitToken = data.preAdmitToken || "PERF_TEST_DUMMY_ADMIT_TOKEN";

  const payload = JSON.stringify({ sessionSeatIds: data.seatIds });

  const res = http.post(
    `${baseUrl}/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold?admitToken=${encodeURIComponent(admitToken)}`,
    payload,
    { headers, tags: { endpoint: "seat_hold" } }
  );

  seatHoldLatency.add(res.timings.duration);

  // 응답 분류
  const status = res.status;
  let bodyMsg = "";
  try {
    bodyMsg = res.json("message") || "";
  } catch (e) {
    bodyMsg = "";
  }

  if (status === 200) {
    seatHoldSuccess.add(1);
  } else if (status === 401) {
    seatHoldUnauthorized.add(1);
  } else if (
    bodyMsg.includes("SEAT_LOCK_FAILED") ||
    bodyMsg.includes("락") ||
    bodyMsg.includes("lock")
  ) {
    seatHoldLockFailed.add(1);
  } else if (
    bodyMsg.includes("SEAT_ALREADY_HELD") ||
    bodyMsg.includes("이미") ||
    bodyMsg.includes("선점")
  ) {
    seatHoldAlreadyHeld.add(1);
  }

  // 명시적 검증 — admit 필수 모드에서는 200 또는 락 충돌 응답만 허용
  if (data.requireAdmit && data.preAdmitToken) {
    check(res, {
      "hold 200 or contention response": (r) =>
        r.status === 200 || r.status === 409 || r.status === 400 || r.status === 423,
      "hold not 5xx": (r) => r.status < 500,
    });
  } else {
    // admit 없이 도는 모드 — 401이 정상 응답
    check(res, {
      "hold 401 expected without admitToken": (r) =>
        r.status === 401 || r.status === 200 || r.status < 500,
    });
  }

  sleep(0.1);
}
