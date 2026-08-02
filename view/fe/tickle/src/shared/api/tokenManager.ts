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
//
// 액세스 토큰은 메모리에만 둔다.
//
// localStorage에 두면 XSS 스크립트가 localStorage.getItem("accessToken") 한 줄로
// 토큰을 꺼내 외부로 보낼 수 있다. 모듈 변수는 같은 XSS로도 값을 꺼내갈 수 없어,
// 토큰을 유출해 두고두고 재사용하는 것을 막는다.
//
// 대신 새로고침하면 사라진다. 리프레시 토큰이 HttpOnly 쿠키로 남아 있으므로
// 부팅 시 restoreSession()으로 되살린다(로그인은 풀리지 않는다).
let accessTokenInMemory: string | null = null;

export const getAccessToken = () => accessTokenInMemory;

export const setAccessToken = (accessToken: string) => {
  accessTokenInMemory = normalizeToken(accessToken);
};

export const setTokens = (accessToken: string) => {
  setAccessToken(accessToken);
};

export const clearTokens = () => {
  accessTokenInMemory = null;
};

/**
 * 새로고침으로 날아간 액세스 토큰을 리프레시 쿠키로 되살립니다.
 *
 * <p>토큰이 메모리에만 있어 새로고침하면 사라집니다. 리프레시 토큰은 HttpOnly
 * 쿠키라 그대로 남아 있으므로, 부팅할 때 한 번 재발급을 시도해 로그인 상태를
 * 이어 갑니다. 비로그인 사용자는 쿠키가 없어 실패하는데 이는 정상입니다.</p>
 *
 * <p>여러 번 불려도 실제 요청은 한 번만 나갑니다. StrictMode의 이중 마운트나
 * 컴포넌트 여럿이 동시에 부르는 경우를 위해 진행 중인 프로미스를 재사용합니다.</p>
 *
 * @return 로그인 상태를 되살렸으면 true
 */
let restorePromise: Promise<boolean> | null = null;

export const restoreSession = (): Promise<boolean> => {
  if (restorePromise) return restorePromise;

  restorePromise = refreshAccessToken().finally(() => {
    // 다음 부팅(로그아웃 후 재로그인 등)에서 다시 시도할 수 있게 풀어 준다.
    restorePromise = null;
  });

  return restorePromise;
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
