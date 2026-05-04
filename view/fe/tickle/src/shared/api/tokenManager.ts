import { buildAuthApiUrl } from './authConfig';

type WaitQueueCallback = () => void;
const USER_ID_STORAGE_KEY = 'userId';
const normalizeToken = (token: string) => token.replace(/^Bearer\s+/i, '');

const parseStoredUserId = (rawUserId: string | null) => {
  if (!rawUserId) {
    return null;
  }

  const userId = Number(rawUserId);
  return Number.isFinite(userId) ? userId : null;
};

const decodeJwtPayload = (token: string) => {
  const payload = token.split('.')[1];

  if (!payload || typeof window === 'undefined' || typeof window.atob !== 'function') {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = window.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const resolveUserIdFromPayload = (payload: Record<string, unknown> | null) => {
  if (!payload) {
    return null;
  }

  const candidates = [
    payload.userId,
    payload.user_id,
    payload.id,
    payload.memberId,
    payload.member_id,
    payload.sub,
  ];

  for (const candidate of candidates) {
    const userId =
      typeof candidate === 'number'
        ? candidate
        : typeof candidate === 'string' && candidate.trim() !== ''
          ? Number(candidate)
          : NaN;

    if (Number.isFinite(userId)) {
      return userId;
    }
  }

  return null;
};

let isRefreshing = false;
let waitQueue: WaitQueueCallback[] = [];

export const getIsRefreshing = () => isRefreshing;

export const setIsRefreshing = (state: boolean) => {
  isRefreshing = state;
};

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

// Token Storage Management
export const getAccessToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem('accessToken');
  return null;
};

export const getRefreshToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem('refreshToken');
  return null;
};

export const getUserId = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedUserId = parseStoredUserId(localStorage.getItem(USER_ID_STORAGE_KEY));

  if (storedUserId !== null) {
    return storedUserId;
  }

  const accessToken = getAccessToken();

  if (!accessToken) {
    return null;
  }

  const tokenUserId = resolveUserIdFromPayload(decodeJwtPayload(accessToken));

  if (tokenUserId !== null) {
    localStorage.setItem(USER_ID_STORAGE_KEY, String(tokenUserId));
  }

  return tokenUserId;
};

export const setTokens = (accessToken: string, refreshToken: string, userId?: number) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', normalizeToken(accessToken));
    localStorage.setItem('refreshToken', normalizeToken(refreshToken));
    if (typeof userId === 'number' && Number.isFinite(userId)) {
      localStorage.setItem(USER_ID_STORAGE_KEY, String(userId));
    } else {
      localStorage.removeItem(USER_ID_STORAGE_KEY);
    }
  }
};

export const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem(USER_ID_STORAGE_KEY);
  }
};

// Refresh API Call
export const refreshAccessToken = async (_baseUrl: string): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(buildAuthApiUrl('/api/v1/auth/reissue'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data.accessToken && data.data.refreshToken) {
        setTokens(data.data.accessToken, data.data.refreshToken, data.data.userId);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};
