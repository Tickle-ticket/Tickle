// =============================================================
// demo_load.js — 시연용 점진적 부하 시나리오
//
// 흐름: 30초 1→100명, 1분 100→500명, 1분 500→1명
// 계정: demo1@k6test.com ~ demo500@k6test.com (각 VU별 다른 USER 계정)
//       → 관리자 대시보드 currentCount가 VU 수에 비례해 증가
// =============================================================

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    demo: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 100 },
        { duration: "1m",  target: 500 },
        { duration: "1m",  target: 1 },
      ],
    },
  },
};

const BASE_URL = __ENV.BASE_URL || "https://tickle-ticket.co.kr";
const EVENT_ID = __ENV.TEST_EVENT_ID || "6062";

// VU 번호(1~500)에 맞는 계정으로 각각 로그인
// setup()은 VU별로 독립 실행이 안 되므로, 각 iteration 첫 실행에서 토큰 캐싱
const tokenCache = {};

function getToken(vuId) {
  if (tokenCache[vuId]) return tokenCache[vuId];

  const idx = ((vuId - 1) % 500) + 1;
  const email = `demo${idx}@k6test.com`;
  const password = "Demo1234!";

  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (res.status === 200) {
    tokenCache[vuId] = res.json("data.accessToken");
  }
  return tokenCache[vuId];
}

export default function () {
  const token = getToken(__VU);
  if (!token) { sleep(1); return; }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 대기열 진입
  const enterRes = http.post(
    `${BASE_URL}/api/v1/queues/${EVENT_ID}/enter?scope=BOOKING`,
    "",
    { headers, tags: { endpoint: "queue_enter" } }
  );
  check(enterRes, { "enter 2xx": (r) => r.status === 201 || r.status === 200 });

  if (enterRes.status !== 201 && enterRes.status !== 200) { sleep(1); return; }

  const requestId = enterRes.json("data.requestId");

  // 토큰 조회
  const tokenRes = http.get(
    `${BASE_URL}/api/v1/queues/${EVENT_ID}/token?scope=BOOKING&requestId=${encodeURIComponent(requestId)}`,
    { headers, tags: { endpoint: "queue_token" } }
  );
  check(tokenRes, { "token 200": (r) => r.status === 200 });

  sleep(1);
}
