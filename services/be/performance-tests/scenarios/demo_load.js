// =============================================================
// demo_load.js — 시연용 점진적 부하 시나리오
//
// 목적: 발표 시연 중 "핵발사버튼" 클릭 후 트래픽이 점진적으로 증가하는
//       모습을 관리자 대시보드에서 보여주기 위한 스크립트.
//
// 흐름:
//   0명 → 1분 → 100명 → 1분 → 300명 → 1분 → 500명 → 1분 → 0명
//   총 약 4분 동안 실행
//
// 실행:
//   BASE_URL=https://tickle-ticket.co.kr \
//   TEST_USER_EMAIL=k6-perf-test@tickle.com \
//   TEST_USER_PASSWORD=PerfTest1! \
//   TEST_EVENT_ID=6038 \
//   k6 run scenarios/demo_load.js
// =============================================================

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    demo: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 100 },  // 30초 동안 1→100명
        { duration: "1m",  target: 500 },  // 1분 동안 100→500명
        { duration: "1m",  target: 1 },    // 1분 동안 500→1명
      ],
    },
  },
  // 임계값 없음 — 시연용이므로 실패 기준 불필요
};

export function setup() {
  const baseUrl = __ENV.BASE_URL || "https://tickle-ticket.co.kr";
  const email = __ENV.TEST_USER_EMAIL;
  const password = __ENV.TEST_USER_PASSWORD;

  const res = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );

  const ok = check(res, { "login OK": (r) => r.status === 200 });
  if (!ok) throw new Error(`login failed: ${res.status}`);

  return { accessToken: res.json("data.accessToken") };
}

export default function (data) {
  const baseUrl = __ENV.BASE_URL || "https://tickle-ticket.co.kr";
  const eventId = __ENV.TEST_EVENT_ID || "6038";
  const headers = {
    Authorization: `Bearer ${data.accessToken}`,
    "Content-Type": "application/json",
  };

  // 대기열 진입 (enter)
  const enterRes = http.post(
    `${baseUrl}/api/v1/queues/${eventId}/enter?scope=BOOKING`,
    "",
    { headers, tags: { endpoint: "queue_enter" } }
  );
  check(enterRes, { "enter 201": (r) => r.status === 201 });

  if (enterRes.status !== 201) { sleep(1); return; }

  const requestId = enterRes.json("data.requestId");

  // 토큰 조회 (token)
  const tokenRes = http.get(
    `${baseUrl}/api/v1/queues/${eventId}/token?scope=BOOKING&requestId=${encodeURIComponent(requestId)}`,
    { headers, tags: { endpoint: "queue_token" } }
  );
  check(tokenRes, { "token 200": (r) => r.status === 200 });

  sleep(1);
}
