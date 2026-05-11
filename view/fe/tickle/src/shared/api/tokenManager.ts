import { buildAuthApiUrl } from './authConfig';

type WaitQueueCallback = () => void;
const normalizeToken = (token: string) => token.replace(/^Bearer\s+/i, '');

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

export const setAccessToken = (accessToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', normalizeToken(accessToken));
  }
};

export const setTokens = (accessToken: string) => {
  setAccessToken(accessToken);
};

export const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
  }
};

// Refresh API Call
export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const refreshUrl = buildAuthApiUrl('/api/v1/auth/reissue');
    const response = await fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include',
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
