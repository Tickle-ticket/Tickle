import { ApiError, RequestOptions } from './types';
import {
  getIsRefreshing,
  setIsRefreshing,
  enqueueWait,
  flushWaitQueue,
  clearWaitQueue,
  refreshAccessToken,
} from './tokenManager';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
  _isRetry = false
): Promise<T> => {
  const url = buildUrl(path, options.params);
  const { body, params, headers, ...restOptions } = options;

  const config: RequestInit = {
    ...restOptions,
    // 실제 통신 시에는 항상 쿠키 전송이 필요합니다. 개발 단계에서 MSW 연동 문제 시 수정 가능.
    credentials: 'include', 
    redirect: 'manual', // 302 자동 추적 방지
    headers: {
      ...(!(body instanceof FormData) && { 'Content-Type': 'application/json' }),
      ...headers,
    },
  };

  if (body) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    // 인증 관련 API는 401을 토큰 갱신이 아닌 일반 에러로 처리
    const isAuthEndpoint = path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/auth/refresh');

    // 401 또는 302(리다이렉트) 발생 시 인증 만료로 간주하여 TokenManager 핸들러로 위임
    if (!isAuthEndpoint && (response.status === 401 || response.type === 'opaqueredirect' || response.status === 302)) {
      return handle401<T>(path, options, _isRetry);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(
        errorData?.message || 'API 요청 중 오류가 발생했습니다.',
        response.status,
        errorData
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
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
  _isRetry: boolean
): Promise<T> => {
  if (_isRetry) {
    // 재시도까지 했는데 실패했다면 로그인 페이지로 리다이렉트
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('인증이 만료되었습니다. 다시 로그인해주세요.', 401);
  }

  // 누군가 이미 리프레시 중이라면 큐(대기열)에 넣고 프로미스를 리턴하여 대기
  if (getIsRefreshing()) {
    return new Promise<T>((resolve, reject) => {
      enqueueWait(() => {
        // 리프레시가 완료되면 이 콜백이 실행되어 원래 요청을 재시도함
        apiClient<T>(path, options, true).then(resolve).catch(reject);
      });
    });
  }

  // 내가 첫 번째 401 발생자라면 리프레시 락(Lock)을 걸고 갱신 시작
  setIsRefreshing(true);
  try {
    const success = await refreshAccessToken(BASE_URL);
    setIsRefreshing(false);

    if (success) {
      // 갱신 성공 시 대기열에 있던 모든 요청 방출(실행)
      flushWaitQueue();
      // 내 원래 요청도 재시도
      return apiClient<T>(path, options, true);
    } else {
      // 갱신 실패 시 큐 비우고 에러 투척
      clearWaitQueue();
      throw new ApiError('리프레시 토큰이 만료되었습니다.', 401);
    }
  } catch (error) {
    setIsRefreshing(false);
    clearWaitQueue();
    throw error;
  }
};
