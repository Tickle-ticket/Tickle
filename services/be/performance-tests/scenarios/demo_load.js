// =============================================================
// demo_load.js — 시연용 점진적 부하 시나리오
//
// 흐름: 30초 1→100명, 1분 100→500명, 1분 500→1명
// 계정: demo1@k6test.com ~ demo500@k6test.com (VU별 다른 USER 계정)
// 대기열: enter → token 획득 → 5초 대기 → leave
//         leave로 ADMITTED 슬롯을 반납해 다음 사람이 계속 입장 가능
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

// VU별 토큰 캐시 (첫 iteration에서 로그인 후 재사용)
const tokenCache = {};

function getToken(vuId) {
  if (tokenCache[vuId]) return tokenCache[vuId];

  const idx = ((vuId - 1) % 500) + 1;
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: `demo${idx}@k6test.com`, password: "Demo1234!" }),
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

  // 1) 대기열 진입
  const enterRes = http.post(
    `${BASE_URL}/api/v1/queues/${EVENT_ID}/enter?scope=BOOKING`,
    "",
    { headers, tags: { endpoint: "queue_enter" } }
  );

  const enterOk = check(enterRes, { "enter 201": (r) => r.status === 201 });
  if (!enterOk) { sleep(1); return; }

  const requestId = enterRes.json("data.requestId");

  // 2) 토큰 조회 (queueToken 획득)
  const tokenRes = http.get(
    `${BASE_URL}/api/v1/queues/${EVENT_ID}/token?scope=BOOKING&requestId=${encodeURIComponent(requestId)}`,
    { headers, tags: { endpoint: "queue_token" } }
  );

  check(tokenRes, { "token 200": (r) => r.status === 200 });
  const queueToken = tokenRes.json("data.queueToken");

  // 3) 5초 대기 (대시보드에서 트래픽 증가 확인할 시간)
  sleep(5);

  // 4) 대기열 나가기 — ADMITTED 슬롯 반납 → 다음 사람 입장 가능
  if (queueToken) {
    http.post(
      `${BASE_URL}/api/v1/queues/${EVENT_ID}/leave?scope=BOOKING&queueToken=${encodeURIComponent(queueToken)}`,
      "",
      { headers, tags: { endpoint: "queue_leave" } }
    );
  }

  sleep(1);
}
