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
import { toApiFailure } from "./toApiFailure";
import { NetworkError, SchemaMismatchError, UnauthorizedError, getFailureCode } from "./errors";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
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

      // 실패 사유를 태그드 에러로 확정한다. 블랙리스트/권한부족 판별(같은 403),
      // 락 경합 여부(같은 409) 같은 구분이 여기서 이뤄진다.
      const failure = toApiFailure(path, response.status, errorData);

      // 블랙리스트는 화면 선택의 여지가 없어 여기서 바로 차단 페이지로 보낸다.
      if (failure._tag === "BlacklistedError" && typeof window !== "undefined") {
        navigateToBlocked("blacklist");
      }

      throw new ApiError(
        failure.message || "API 요청 중 오류가 발생했습니다.",
        response.status,
        errorData,
        { code: getFailureCode(failure), failure },
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

        // HTTP는 성공(2xx)했으므로 response.status를 그대로 쓰면 "200인데 에러"가
        // 되어 재시도·에러 화면 정책이 모두 빗나간다. 5xx로 올려 서버 계약 문제로
        // 다루고, 태그로 실제 원인을 남긴다.
        const failure = new SchemaMismatchError({ path, cause: parseError, received: data });
        throw new ApiError(failure.message, 500, data, { failure });
      }
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // fetch 자체가 실패했다(오프라인·DNS·CORS·서버 다운). 응답이 없으므로 status가
    // 없지만, 호출부 대부분이 error.status로 분기하므로 0을 넣어 4xx/5xx와 구분한다.
    const failure = new NetworkError({ path, cause: error });
    throw new ApiError(failure.message, 0, undefined, { failure });
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

    const expired = new UnauthorizedError({ path });
    throw new ApiError(expired.message, 401, undefined, { failure: expired });
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
  const expired = new UnauthorizedError({ path });
  const failure = new ApiError(expired.message, 401, undefined, { failure: expired });
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
