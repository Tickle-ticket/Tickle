import { buildAuthApiUrl } from "./authConfig";
import { ApiError } from "./types";

type WaitQueueEntry = {
  run: () => void;
  abort: (reason: unknown) => void;
};

const normalizeToken = (token: string) => token.replace(/^Bearer\s+/i, "");

let isRefreshing = false;
let waitQueue: WaitQueueEntry[] = [];

export const getIsRefreshing = () => isRefreshing;

export const setIsRefreshing = (state: boolean) => {
  isRefreshing = state;
};

export const enqueueWait = (callback: WaitQueueEntry) => {
  waitQueue.push(callback);
};

export const flushWaitQueue = () => {
  const queue = waitQueue;
  waitQueue = [];
  queue.forEach(({ run, abort }) => {
    try {
      run();
    } catch (error) {
      abort(error);
    }
  });
};

export const clearWaitQueue = (reason?: unknown) => {
  const queue = waitQueue;
  waitQueue = [];
  const error =
    reason ??
    new ApiError("로그인 세션이 만료되었습니다. 다시 로그인해주세요.", 401);
  queue.forEach(({ abort }) => {
    try {
      abort(error);
    } catch {
      /* abort 자체 실패는 무시 */
    }
  });
};

// Token Storage Management
export const getAccessToken = () => {
  if (typeof window !== "undefined") return localStorage.getItem("accessToken");
  return null;
};

export const setAccessToken = (accessToken: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", normalizeToken(accessToken));
  }
};

export const setTokens = (accessToken: string) => {
  setAccessToken(accessToken);
};

export const clearTokens = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
  }
};

// Refresh API Call
export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const refreshUrl = buildAuthApiUrl("/api/v1/auth/reissue");
    const response = await fetch(refreshUrl, {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data.accessToken) {
        setAccessToken(data.data.accessToken);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};
