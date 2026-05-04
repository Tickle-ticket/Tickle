'use client';

import { useEffect } from 'react';
import { ErrorView } from '@/src/shared/components/ErrorView';

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

  // 전달받은 error 객체의 상태 코드나 메시지를 분석해 적절한 에러 뷰 매핑
  let errorType: '404' | '500' | '401' | 'timeout' | 'soldout' = '500';
  const errorMessage = error.message?.toLowerCase() || '';

  if (error.status === 404 || errorMessage.includes('404')) errorType = '404';
  else if (error.status === 401 || errorMessage.includes('401')) errorType = '401';
  else if (error.status === 408 || errorMessage.includes('timeout')) errorType = 'timeout';
  else if (errorMessage.includes('soldout') || errorMessage.includes('매진')) errorType = 'soldout';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <ErrorView 
        type={errorType}
        // 백엔드에서 보내준 에러 메시지가 있고, 브라우저/리액트의 기술적 에러(예: Unexpected token)가 아닐 경우 유저에게 직접 노출
        description={
          error.message && !error.message.toLowerCase().includes('unexpected') && !error.message.toLowerCase().includes('network')
            ? error.message 
            : undefined // 그렇지 않으면 ErrorView에 정의된 예쁜 기본 문구 자동 사용
        }
        onAction={() => reset()}
      />
    </div>
  );
}
