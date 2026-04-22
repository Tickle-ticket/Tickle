type WaitQueueCallback = () => void;

let isRefreshing = false;
let waitQueue: WaitQueueCallback[] = [];

export const getIsRefreshing = () => isRefreshing;

export const setIsRefreshing = (state: boolean) => {
  isRefreshing = state;
};

// HttpOnly 환경이므로 새 토큰 문자열을 건네받지 않고 단순 실행만 예약합니다.
export const enqueueWait = (callback: WaitQueueCallback) => {
  waitQueue.push(callback);
};

export const flushWaitQueue = () => {
  waitQueue.forEach((callback) => callback());
  waitQueue = [];
};

export const clearWaitQueue = () => {
  waitQueue = [];
};

// 리프레시 API 호출 모듈 (HttpOnly 쿠키 포함)
export const refreshAccessToken = async (baseUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
};
