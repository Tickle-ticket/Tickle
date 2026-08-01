/**
 * 차단 페이지로 이동하는 중임을 나타내는 전역 플래그.
 *
 * <p>모듈 변수로 두면 안 된다 — `location.replace`로 문서가 통째로 바뀌면 모듈이
 * 다시 평가되어 값이 사라진다. 이동 직전에 세운 표시를 이동 직후 화면이 읽어야
 * 하므로 window에 남긴다.</p>
 */
const BLOCKED_NAVIGATION_FLAG = '__isNavigatingToBlocked__';

export const markBlockedNavigation = () => {
  if (typeof window === 'undefined') return;

  window[BLOCKED_NAVIGATION_FLAG] = true;
};

export const isBlockedNavigation = () => (
  typeof window !== 'undefined' && window[BLOCKED_NAVIGATION_FLAG] === true
);

export const navigateToBlocked = (reason?: string) => {
  if (typeof window === 'undefined') return;

  markBlockedNavigation();

  const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  window.location.replace(`/blocked${query}`);
};
