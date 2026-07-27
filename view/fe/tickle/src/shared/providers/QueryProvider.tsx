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
          onError: (error: any, query: any) => {
            // meta.silent가 설정된 쿼리는 글로벌 에러 로그를 남기지 않음
            if (query?.meta?.silent) return;
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
            // 4xx는 재시도해도 결과가 같다(권한 없음·리소스 없음 등).
            // 재시도는 네트워크 오류·5xx처럼 일시적 실패에만 의미가 있다.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status < 500) return false;
              return failureCount < 1;
            },
            // 403·404·5xx는 화면이 개별 처리하지 않아도 Error Boundary가 받도록 위로 던진다.
            // 화면 안에서 인라인으로 다루고 싶으면 해당 쿼리에서 throwOnError: false로 끈다.
            // 400·409는 입력값·상태 충돌이라 대응이 화면마다 달라 던지지 않는다.
            throwOnError: (error) =>
              error instanceof ApiError &&
              (error.status >= 500 || error.status === 404 || error.status === 403),
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
