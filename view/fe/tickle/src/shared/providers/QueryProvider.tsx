'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';
import { ApiError } from '../api/types';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: any) => {
            if (error instanceof ApiError) {
              if (error.status !== 401 && error.status !== 403) {
                console.error('데이터를 불러오는 중 오류가 발생했습니다:', error.message);
              }
            } else {
              console.error('데이터를 불러오는 중 알 수 없는 오류가 발생했습니다:', error);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error: any) => {
            if (error instanceof ApiError) {
              if (error.status !== 401 && error.status !== 403) {
                console.error('요청 처리 중 오류가 발생했습니다:', error.message);
              }
            } else {
              console.error('요청 처리 중 알 수 없는 오류가 발생했습니다:', error);
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
