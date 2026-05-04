'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/src/shared/api/authApi';
import { setTokens } from '@/src/shared/api/tokenManager';

export function KakaoCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    // React 18 Strict Mode에서 두 번 실행되는 것을 방지
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Kakao login error:', error);
      alert('카카오 로그인 중 오류가 발생했습니다.');
      router.push('/login');
      return;
    }

    if (!code) {
      router.push('/login');
      return;
    }

    const processLogin = async () => {
      try {
        const response = await authApi.kakaoCallback(code);
        if (response.data) {
          setTokens(response.data.accessToken, response.data.refreshToken);
          router.push('/');
        }
      } catch (err) {
        console.error('Kakao callback failed:', err);
        alert('카카오 로그인 처리에 실패했습니다.');
        router.push('/login');
      }
    };

    processLogin();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500"></div>
        <p className="text-sm font-medium text-slate-500">카카오 로그인 처리 중입니다...</p>
      </div>
    </div>
  );
}
