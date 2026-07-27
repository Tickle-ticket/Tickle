import { ApiError, RequestOptions } from "./types";
import { Schema } from "effect";
import {
  getIsRefreshing,
  setIsRefreshing,
  enqueueWait,
  flushWaitQueue,
  clearWaitQueue,
  refreshAccessToken,
  getAccessToken,
  clearTokens,
} from "./tokenManager";
import { navigateToBlocked } from "../utils/blockedNavigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
// 서버에서 BlacklistInterceptor가 적용된 경로 (services/be WebMvcConfig#addInterceptors).
// 이 경로 밖의 403은 블랙리스트일 수 없다.
const BLACKLIST_GUARDED_PATHS = ["/api/v1/queue/", "/api/v1/reservations/"];

const AUTH_ENDPOINT_PATTERNS = [
  "/auth/login",
  "/auth/signup",
  "/auth/logout",
  "/auth/reissue",
  "/auth/kakao",
  "/auth/phone/",
];

const buildUrl = (path: string, params?: RequestOptions["params"]) => {
  const base =
    BASE_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");
  const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
};

export const apiClient = async <T>(
  path: string,
  options: RequestOptions = {},
  _isRetry = false,
  schema?: Schema.Schema.AnyNoContext,
): Promise<T> => {
  const url = buildUrl(path, options.params);
  const {
    body,
    headers,
    credentials,
    auth = "required",
    ...restOptions
  } = options;

  const accessToken = getAccessToken();
  const isAuthEndpoint = AUTH_ENDPOINT_PATTERNS.some((pattern) =>
    path.includes(pattern),
  );
  const shouldAttachAccessToken = auth !== "none" && !!accessToken;

  // 크로스 오리진 여부 판별: 로컬 개발 환경(localhost)에서 원격 API 서버로 요청할 때
  // credentials: 'include'는 CORS preflight에서 Access-Control-Allow-Credentials가 필요하며
  // 백엔드가 localhost를 허용하지 않으면 요청 자체가 차단됨.
  // 인증은 Authorization 헤더로 처리하므로, 크로스 오리진 시 쿠키 전송은 불필요.
  const isCrossOrigin =
    typeof window !== "undefined" &&
    BASE_URL &&
    !url.startsWith(window.location.origin);

  const config: RequestInit = {
    ...restOptions,
    credentials:
      credentials ??
      (isAuthEndpoint ? "include" : isCrossOrigin ? "same-origin" : "include"),
    redirect: "manual", // 302 자동 추적 방지
    headers: {
      ...(body !== undefined &&
        !(body instanceof FormData) && { "Content-Type": "application/json" }),
      ...(shouldAttachAccessToken && {
        Authorization: `Bearer ${accessToken}`,
      }),
      ...headers,
    },
  };

  if (body) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    // 인증 관련 API는 401을 토큰 갱신이 아닌 일반 에러로 처리

    // 401 또는 302(리다이렉트) 발생 시 인증 만료로 간주하여 TokenManager 핸들러로 위임
    // 단, accessToken이 없는 비회원 상태에서는 토큰 갱신을 시도하지 않음
    if (
      !isAuthEndpoint &&
      shouldAttachAccessToken &&
      (response.status === 401 ||
        response.type === "opaqueredirect" ||
        response.status === 302)
    ) {
      return handle401<T>(path, options, _isRetry, schema);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      // 403 Forbidden 처리 — 블랙리스트만 차단 화면으로 보낸다.
      // 서버는 403을 블랙리스트(BLACKLISTED_USER) 외에도 권한 부족(ACCESS_DENIED,
      // BOOKING_ACCESS_DENIED)·비활성 계정(USER_NOT_ACTIVE)에 사용하며,
      // GlobalExceptionHandler가 에러코드 이름 없이 {status, message}만 내려준다.
      // status만 보고 차단하면 남의 예매를 조회한 정상 사용자까지 차단 화면을 보게 되므로,
      // 블랙리스트 인터셉터가 걸린 경로(WebMvcConfig)와 메시지를 함께 확인한다.
      if (response.status === 403 && !path.includes("/api/v1/admin/")) {
        const isBlacklistGuardedPath = BLACKLIST_GUARDED_PATHS.some((guardedPath) =>
          path.includes(guardedPath),
        );
        const isBlacklistMessage =
          typeof errorData?.message === "string" &&
          errorData.message.includes("블랙리스트");

        if (isBlacklistGuardedPath && isBlacklistMessage && typeof window !== "undefined") {
          navigateToBlocked("blacklist");
        }
      }

      throw new ApiError(
        errorData?.message || "API 요청 중 오류가 발생했습니다.",
        response.status,
        errorData,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();

    // 만약 schema가 전달되었다면 파싱(유효성 검사) 수행
    if (schema) {
      try {
        return Schema.decodeUnknownSync(schema)(data) as unknown as T;
      } catch (parseError) {
        console.error(
          `[API Schema Error] ${path} 응답 데이터가 스키마와 불일치합니다:`,
          parseError,
        );
        throw new ApiError(
          "서버 응답 형식이 올바르지 않습니다.",
          response.status,
          data,
        );
      }
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(
      `Network Error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
  }
};

const handle401 = async <T>(
  path: string,
  options: RequestOptions,
  _isRetry: boolean,
  schema?: Schema.Schema.AnyNoContext,
): Promise<T> => {
  const isOptionalAuth = options.auth === "optional";

  if (_isRetry) {
    if (isOptionalAuth) {
      clearTokens();
      return apiClient<T>(path, { ...options, auth: "none" }, true, schema);
    }

    // 재시도까지 했는데 실패했다면 로그인 페이지로 리다이렉트
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      const currentPath = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/login?redirect=${currentPath}`;
    }
    throw new ApiError(
      "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
      401,
    );
  }

  // 누군가 이미 리프레시 중이라면 큐(대기열)에 넣고 프로미스를 리턴하여 대기
  if (getIsRefreshing()) {
    return new Promise<T>((resolve, reject) => {
      enqueueWait({
        // 리프레시가 완료되면 이 콜백이 실행되어 원래 요청을 재시도함
        run: () => {
          apiClient<T>(path, options, true, schema).then(resolve).catch(reject);
        },
        // 리프레시 실패로 큐가 비워질 때 호출 — 대기 중인 프로미스를 확정시킴
        abort: (reason) => {
          // optional 인증은 비회원으로 강등해 화면을 살림
          if (isOptionalAuth) {
            apiClient<T>(path, { ...options, auth: "none" }, true, schema)
              .then(resolve)
              .catch(reject);
            return;
          }
          reject(reason);
        },
      });
    });
  }

  // 내가 첫 번째 401 발생자라면 리프레시 락(Lock)을 걸고 갱신 시작
  setIsRefreshing(true);
  let success = false;

  try {
    success = await refreshAccessToken();
  } finally {
    setIsRefreshing(false); // ② 무슨 일이 있어도 락 해제
  }

  if (success) {
    flushWaitQueue(); // 락 해제 후 flush — 순서 유지
    return apiClient<T>(path, options, true, schema);
  }

  // --- 여기부터 갱신 실패 처리 ---
  // 대기 중인 요청들에게 실패를 통보(abort)하며 큐를 비움
  const failure = new ApiError(
    "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
    401,
  );
  clearWaitQueue(failure);
  clearTokens();

  // optional 인증은 로그인 페이지로 보내지 않고 비회원으로 강등해 화면을 살림
  if (isOptionalAuth) {
    return apiClient<T>(path, { ...options, auth: "none" }, true, schema);
  }

  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    const currentPath = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.href = `/login?redirect=${currentPath}`;
  }
  throw failure;
};
