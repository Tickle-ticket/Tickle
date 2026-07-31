import { buildAuthApiUrl } from "./authConfig";
import { ApiError } from "./types";

type WaitQueueEntry = {
  run: () => void;
  abort: (reason: unknown) => void;
};

/** 큐에 담긴 항목과 그 만료 타이머. */
type QueuedItem = {
  entry: WaitQueueEntry;
  timeoutId: ReturnType<typeof setTimeout>;
};

/**
 * 대기 항목을 붙잡아 둘 최대 시간.
 *
 * 큐에 담긴 요청은 flushWaitQueue나 clearWaitQueue가 불려야 결말이 난다.
 * 리프레시 도중 탭이 백그라운드로 밀려 타이머가 지연되는 등으로 둘 다 불리지
 * 않으면 프로미스가 영원히 pending이라 화면이 로딩에 고착된다. 마지막 안전장치로
 * 스스로 끊어 최소한 에러 UI에는 닿게 한다.
 */
const WAIT_QUEUE_TIMEOUT_MS = 30_000;

const normalizeToken = (token: string) => token.replace(/^Bearer\s+/i, "");

let isRefreshing = false;
let waitQueue: QueuedItem[] = [];

export const getIsRefreshing = () => isRefreshing;

export const setIsRefreshing = (state: boolean) => {
  isRefreshing = state;
};

export const enqueueWait = (callback: WaitQueueEntry) => {
  const timeoutId = setTimeout(() => {
    // 자기 자신만 큐에서 빼낸다. 다른 항목은 아직 리프레시 결과를 기다릴 수 있다.
    const index = waitQueue.findIndex((item) => item.entry === callback);
    if (index === -1) return;
    waitQueue.splice(index, 1);

    try {
      callback.abort(
        new ApiError("인증 갱신이 지연되어 요청을 취소했습니다.", 408),
      );
    } catch {
      /* abort 자체 실패는 무시 */
    }
  }, WAIT_QUEUE_TIMEOUT_MS);

  waitQueue.push({ entry: callback, timeoutId });
};

/** 큐를 비우면서 각 항목의 만료 타이머도 함께 해제한다. */
const drainQueue = (): WaitQueueEntry[] => {
  const queue = waitQueue;
  waitQueue = [];
  queue.forEach(({ timeoutId }) => clearTimeout(timeoutId));
  return queue.map(({ entry }) => entry);
};

export const flushWaitQueue = () => {
  drainQueue().forEach(({ run, abort }) => {
    try {
      run();
    } catch (error) {
      abort(error);
    }
  });
};

export const clearWaitQueue = (reason?: unknown) => {
  const error =
    reason ??
    new ApiError("로그인 세션이 만료되었습니다. 다시 로그인해주세요.", 401);
  drainQueue().forEach(({ abort }) => {
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
