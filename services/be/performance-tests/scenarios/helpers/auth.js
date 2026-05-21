// =============================================================
// auth.js — 로그인 후 access token을 획득하는 공통 헬퍼
//
// Tickle Auth 응답 포맷 (실제 코드 기준):
//   POST /api/v1/auth/login
//   Body: { email, password }
//   Response Body:
//     { status: 200, message: "OK", data: { accessToken: "..." } }
//
// access token은 BaseResponse.data.accessToken 안에 들어있다.
// (헤더가 아니라 body 필드라는 점 주의 — refreshToken은 HttpOnly 쿠키로 내려옴)
// =============================================================

import http from "k6/http";
import { check, fail } from "k6";

/**
 * 환경변수에서 필수 값을 읽고 없으면 fail.
 */
export function requireEnv(name) {
  const value = __ENV[name];
  if (!value || value.length === 0) {
    fail(`required env var missing: ${name}`);
  }
  return value;
}

/**
 * 단일 계정으로 로그인하고 accessToken을 반환한다.
 *
 * @returns {string} accessToken (Bearer 접두어 없이 raw 값)
 */
export function login() {
  const authBaseUrl = requireEnv("AUTH_BASE_URL");
  const email = requireEnv("TEST_USER_EMAIL");
  const password = requireEnv("TEST_USER_PASSWORD");

  const payload = JSON.stringify({ email, password });
  const res = http.post(`${authBaseUrl}/api/v1/auth/login`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { endpoint: "auth_login" },
  });

  const ok = check(res, {
    "login 200": (r) => r.status === 200,
    "login has accessToken": (r) => {
      try {
        const body = r.json();
        return body && body.data && typeof body.data.accessToken === "string";
      } catch (e) {
        return false;
      }
    },
  });

  if (!ok) {
    fail(`login failed: status=${res.status} body=${res.body}`);
  }

  return res.json("data.accessToken");
}

/**
 * Bearer 토큰을 포함한 기본 인증 헤더를 만든다.
 *
 * @param {string} accessToken
 * @returns {{ Authorization: string, "Content-Type": string }}
 */
export function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * setup() 단계에서 토큰을 1회 발급해 모든 VU가 공유하도록 한다.
 *
 * PRE_GENERATED_TOKEN 환경변수가 있으면 login() 호출 없이 그 값을 사용한다.
 * 로컬 BE 테스트 시 Auth 서비스 없이 동작 가능.
 *
 * @returns {{ accessToken: string }}
 */
export function setupAuth() {
  const preToken = __ENV.PRE_GENERATED_TOKEN;
  if (preToken && preToken.length > 0) {
    console.log("Using pre-generated JWT token (skip login)");
    return { accessToken: preToken };
  }
  const accessToken = login();
  return { accessToken };
}
