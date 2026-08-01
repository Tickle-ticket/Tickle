'use client';

import { useSyncExternalStore } from 'react';

/** 초 단위로 판정하므로 1초보다 자주 볼 이유가 없다. */
const TICK_INTERVAL_MS = 1000;

let currentNow = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

/**
 * 구독자가 하나라도 있는 동안만 타이머를 돌린다.
 * 컴포넌트마다 setInterval을 두면 화면에 카드가 20장일 때 타이머도 20개가 된다.
 */
const subscribe = (onStoreChange: () => void) => {
  listeners.add(onStoreChange);

  if (intervalId === null) {
    currentNow = Date.now();
    intervalId = setInterval(() => {
      currentNow = Date.now();
      listeners.forEach((listener) => listener());
    }, TICK_INTERVAL_MS);
  }

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
};

const getSnapshot = () => {
  // 첫 구독 전에 읽히는 경우가 있어 여기서도 초기화해 둔다.
  if (currentNow === 0) currentNow = Date.now();
  return currentNow;
};

// 서버에는 흐르는 시간이 없다. 0을 주면 "모든 시각이 과거"로 판정돼 SSR HTML과
// 클라이언트 첫 렌더가 어긋나므로, 시간에 의존하는 UI는 hydration 이후에 확정된다.
const getServerSnapshot = () => 0;

/**
 * 1초마다 갱신되는 현재 시각(epoch ms)을 돌려줍니다.
 *
 * <p>렌더 중에 {@code Date.now()}를 직접 부르면 두 가지가 깨집니다. 하나는 순수성이라
 * 같은 props로 렌더해도 결과가 달라지고, 다른 하나는 더 실질적인 문제로 시각이
 * 경계를 넘어도(판매 시작 시각이 지나도) 리렌더를 유발하지 않아 버튼이 계속
 * 비활성으로 남습니다. 다른 state가 우연히 바뀔 때까지 화면이 낡은 채로 있습니다.</p>
 *
 * <p>여기서는 시각을 외부 스토어로 두어 1초마다 구독자를 깨웁니다. 경계를 넘는 순간
 * 리렌더가 일어나므로 버튼이 스스로 열립니다.</p>
 *
 * @return 현재 시각(epoch ms). 서버 렌더 중에는 0
 */
export const useNow = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
