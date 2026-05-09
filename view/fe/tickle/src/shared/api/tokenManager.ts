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

export const getRefreshToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem('refreshToken');
  return null;
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', normalizeToken(accessToken));
    localStorage.setItem('refreshToken', normalizeToken(refreshToken));
  }
};

export const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

  }
};

// Refresh API Call
export const refreshAccessToken = async (_baseUrl: string): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const refreshUrl = buildAuthApiUrl('/api/v1/auth/reissue');
    const isCrossOrigin = typeof window !== 'undefined' && !refreshUrl.startsWith(window.location.origin);
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      credentials: isCrossOrigin ? 'same-origin' : 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data.accessToken && data.data.refreshToken) {
        setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};
