const BLOCKED_NAVIGATION_FLAG = '__isNavigatingToBlocked__';

export const markBlockedNavigation = () => {
  if (typeof window === 'undefined') return;

  (window as any)[BLOCKED_NAVIGATION_FLAG] = true;
};

export const isBlockedNavigation = () => (
  typeof window !== 'undefined' && (window as any)[BLOCKED_NAVIGATION_FLAG] === true
);

export const navigateToBlocked = (reason?: string) => {
  if (typeof window === 'undefined') return;

  markBlockedNavigation();

  const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  window.location.replace(`/blocked${query}`);
};
