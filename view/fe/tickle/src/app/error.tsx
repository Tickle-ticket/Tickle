'use client';

import { useEffect } from 'react';
import { ErrorView } from '@/src/shared/components/ErrorView';
import { ApiErrorView } from '@/src/shared/components/ApiErrorView';
import { ApiError } from '@/src/shared/api/types';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}) {
  useEffect(() => {
    // 실제 운영 환경이라면 여기서 센트리(Sentry) 같은 에러 추적 시스템으로 로그를 보냅니다.
    console.error('Global Error Boundary Caught:', error);
  }, [error]);

  // React Query가 throwOnError로 올려보낸 API 에러는 status·message가 정확하므로
  // 문자열 추론 없이 ApiErrorView가 그대로 처리한다(QueryProvider 참고).
  if (error instanceof ApiError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface">
        <ApiErrorView error={error} onAction={() => reset()} actionText="다시 시도" />
      </div>
    );
  }

  // 그 외(JS 런타임 에러 등)는 status·메시지로 유형을 추론한다.
  let errorType: '404' | '500' | '403' | '401' | 'timeout' | 'soldout' = '500';
  const errorMessage = error.message?.toLowerCase() || '';

  if (error.status === 404 || errorMessage.includes('404')) errorType = '404';
  else if (error.status === 403 || errorMessage.includes('403')) errorType = '403';
  else if (error.status === 401 || errorMessage.includes('401')) errorType = '401';
  else if (error.status === 408 || errorMessage.includes('timeout')) errorType = 'timeout';
  else if (errorMessage.includes('soldout') || errorMessage.includes('매진')) errorType = 'soldout';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface">
      <ErrorView
        type={errorType}
        // 500번대(JS 런타임 에러 등 알 수 없는 오류)는 기본 예쁜 문구를 사용하고, 그 외의 에러(401, 404 등)는 메시지 노출
        description={
          errorType !== '500' && error.message
            ? error.message
            : undefined
        }
        onAction={() => reset()}
      />
    </div>
  );
}
