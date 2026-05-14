import { ApiError, RequestOptions } from './types';
import { Schema } from 'effect';
import {
  getIsRefreshing,
  setIsRefreshing,
  enqueueWait,
  flushWaitQueue,
  clearWaitQueue,
  refreshAccessToken,
  getAccessToken,
  clearTokens,
} from './tokenManager';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const AUTH_ENDPOINT_PATTERNS = [
  '/auth/login',
  '/auth/signup',
  '/auth/logout',
  '/auth/reissue',
  '/auth/kakao',
  '/auth/phone/',
];

const buildUrl = (path: string, params?: RequestOptions['params']) => {
  const base = BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const url = new URL(path.startsWith('http') ? path : `${base}${path}`);
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
  schema?: Schema.Schema.AnyNoContext
): Promise<T> => {
  const url = buildUrl(path, options.params);
  const { body, headers, credentials, auth = 'required', ...restOptions } = options;

  const accessToken = getAccessToken();
  const isAuthEndpoint = AUTH_ENDPOINT_PATTERNS.some((pattern) => path.includes(pattern));
  const shouldAttachAccessToken = auth !== 'none' && !!accessToken;

  // 크로스 오리진 여부 판별: 로컬 개발 환경(localhost)에서 원격 API 서버로 요청할 때
  // credentials: 'include'는 CORS preflight에서 Access-Control-Allow-Credentials가 필요하며
  // 백엔드가 localhost를 허용하지 않으면 요청 자체가 차단됨.
  // 인증은 Authorization 헤더로 처리하므로, 크로스 오리진 시 쿠키 전송은 불필요.
  const isCrossOrigin = typeof window !== 'undefined' && BASE_URL && !url.startsWith(window.location.origin);

  const config: RequestInit = {
    ...restOptions,
    credentials: credentials ?? (isAuthEndpoint ? 'include' : isCrossOrigin ? 'same-origin' : 'include'),
    redirect: 'manual', // 302 자동 추적 방지
    headers: {
      ...(body !== undefined && !(body instanceof FormData) && { 'Content-Type': 'application/json' }),
      ...(shouldAttachAccessToken && { Authorization: `Bearer ${accessToken}` }),
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
    if (!isAuthEndpoint && shouldAttachAccessToken && (response.status === 401 || response.type === 'opaqueredirect' || response.status === 302)) {
      return handle401<T>(path, options, _isRetry, schema);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      
      // 403 Forbidden (블랙리스트 등) 처리
      if (response.status === 403 && !path.includes('/api/v1/admin/')) {
        if (typeof window !== 'undefined') {
          window.location.href = '/blocked?reason=blacklist';
        }
      }
      
      throw new ApiError(
        errorData?.message || 'API 요청 중 오류가 발생했습니다.',
        response.status,
        errorData
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
        console.error(`[API Schema Error] ${path} 응답 데이터가 스키마와 불일치합니다:`, parseError);
        throw new ApiError('서버 응답 형식이 올바르지 않습니다.', response.status, data);
      }
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

const handle401 = async <T>(
  path: string,
  options: RequestOptions,
  _isRetry: boolean,
  schema?: Schema.Schema.AnyNoContext
): Promise<T> => {
  const isOptionalAuth = options.auth === 'optional';

  if (_isRetry) {
    if (isOptionalAuth) {
      clearTokens();
      return apiClient<T>(path, { ...options, auth: 'none' }, true, schema);
    }

    // 재시도까지 했는데 실패했다면 로그인 페이지로 리다이렉트
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${currentPath}`;
    }
    throw new ApiError('로그인 세션이 만료되었습니다. 다시 로그인해주세요.', 401);
  }

  // 누군가 이미 리프레시 중이라면 큐(대기열)에 넣고 프로미스를 리턴하여 대기
  if (getIsRefreshing()) {
    return new Promise<T>((resolve, reject) => {
      enqueueWait(() => {
        // 리프레시가 완료되면 이 콜백이 실행되어 원래 요청을 재시도함
        apiClient<T>(path, options, true, schema).then(resolve).catch(reject);
      });
    });
  }

  // 내가 첫 번째 401 발생자라면 리프레시 락(Lock)을 걸고 갱신 시작
  setIsRefreshing(true);
  try {
    const success = await refreshAccessToken();
    setIsRefreshing(false);

    if (success) {
      // 갱신 성공 시 대기열에 있던 모든 요청 방출(실행)
      flushWaitQueue();
      // 내 원래 요청도 재시도
      return apiClient<T>(path, options, true, schema);
    } else {
      if (isOptionalAuth) {
        clearWaitQueue();
        clearTokens();
        return apiClient<T>(path, { ...options, auth: 'none' }, true, schema);
      }

      // 갱신 실패 시 큐 비우고, 로컬 스토리지 비우고, 로그인 페이지로 강제 이동
      clearWaitQueue();
      clearTokens();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?redirect=${currentPath}`;
      }
      throw new ApiError('로그인 세션이 만료되었습니다. 다시 로그인해주세요.', 401);
    }
  } catch (error) {
    setIsRefreshing(false);
    clearWaitQueue();
    // ApiError가 이미 위 분기에서 throw된 경우 토큰은 이미 정리된 상태이므로 중복 처리하지 않음
    if (error instanceof ApiError) {
      throw error;
    }
    if (isOptionalAuth) {
      clearTokens();
      return apiClient<T>(path, { ...options, auth: 'none' }, true, schema);
    }
    clearTokens();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${currentPath}`;
    }
    throw error;
  }
};
