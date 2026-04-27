'use client';

import { ReactNode, useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: ReactNode }) {
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined') {
        if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
          const { worker } = await import('../api/mock/browser');
          await worker.start({
            onUnhandledRequest: 'bypass',
          });
        }
        setMswReady(true);
      }
    };

    if (!mswReady) {
      init();
    }
  }, [mswReady]);

  if (!mswReady) {
    return null; // OR you can return a loading spinner if preferred
  }

  return <>{children}</>;
}
