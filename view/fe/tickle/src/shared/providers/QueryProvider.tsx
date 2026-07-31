'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';
import { ApiError } from '../api/types';
import { isRetryable, isFatalByDefault, type ApiFailure } from '../api/errors';

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
            // 재시도는 일시적 실패에만 의미가 있다 — 네트워크·타임아웃·5xx, 그리고
            // 좌석 분산락 경합(409 SEAT_LOCK_FAILED)처럼 잠시 후면 풀리는 경우다.
            // 권한 없음·리소스 없음 같은 4xx는 다시 보내도 결과가 같다.
            retry: (failureCount, error) => {
              if (!(error instanceof ApiError)) return false;
              if (!error.failure) return error.status >= 500 && failureCount < 1;
              return isRetryable(error.failure as ApiFailure) && failureCount < 1;
            },
            // 화면이 개별 처리하지 않은 실패는 Error Boundary가 받도록 위로 던진다.
            // 화면 안에서 인라인으로 다루고 싶으면 해당 쿼리에서 throwOnError: false로 끈다.
            // 입력값·상태 충돌(400·409)은 대응이 화면마다 달라 던지지 않는다.
            throwOnError: (error) => {
              if (!(error instanceof ApiError)) return false;
              if (!error.failure) {
                return error.status >= 500 || error.status === 404 || error.status === 403;
              }
              return isFatalByDefault(error.failure as ApiFailure);
            },
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
