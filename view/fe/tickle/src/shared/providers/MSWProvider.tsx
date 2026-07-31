'use client';

import { ReactNode, useEffect, useState } from 'react';

/** mock을 켤지 여부. 빌드 시점에 정해지므로 렌더 중 바뀌지 않는다. */
const isMockingEnabled = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

/**
 * MSW 워커를 앱 진입점에서 시작합니다.
 *
 * mock을 켠 경우에만 워커가 준비될 때까지 렌더를 미룬다 — 첫 요청이 가로채이기
 * 전에 나가면 실제 서버로 새기 때문이다.
 *
 * 반대로 mock이 꺼져 있으면 기다릴 이유가 없다. 예전에는 이 경우에도 useEffect가
 * 한 번 돌 때까지 앱 전체를 null로 반환해, 프로덕션에서도 첫 프레임이 비었다.
 */
export function MSWProvider({ children }: { children: ReactNode }) {
  const [isWorkerReady, setIsWorkerReady] = useState(!isMockingEnabled);

  useEffect(() => {
    if (!isMockingEnabled || isWorkerReady) {
      return;
    }

    const startWorker = async () => {
      const { worker } = await import('../api/mock/browser');
      await worker.start({ onUnhandledRequest: 'bypass' });
      setIsWorkerReady(true);
    };

    startWorker();
  }, [isWorkerReady]);

  if (!isWorkerReady) {
    return null;
  }

  return <>{children}</>;
}
