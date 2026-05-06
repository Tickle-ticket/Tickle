'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/src/shared/api/authApi';
import { setTokens } from '@/src/shared/api/tokenManager';
import { ApiError } from '@/src/shared/api/types';

const readTokensFromHash = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');

  if (!accessToken || !refreshToken) {
    return null;
  }

  const rawUserId = params.get('userId');
  const userId = rawUserId ? Number(rawUserId) : undefined;

  return {
    accessToken,
    refreshToken,
    userId: Number.isFinite(userId) ? userId : undefined,
  };
};

export function KakaoCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) {
      return;
    }
    processed.current = true;

    const tokenPayload = readTokensFromHash();

    if (tokenPayload) {
      setTokens(tokenPayload.accessToken, tokenPayload.refreshToken, tokenPayload.userId);
      router.replace('/');
      return;
    }

    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (error) {
      console.error('Kakao login error:', error, message);
      alert(message || '카카오 로그인 중 오류가 발생했습니다.');
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
          setTokens(response.data.accessToken, response.data.refreshToken, response.data.userId);
          router.replace('/');
        }
      } catch (err) {
        console.error('Kakao callback failed:', err);
        alert(
          err instanceof ApiError && err.status === 404
            ? '카카오 로그인 API가 연결되지 않았습니다. 인증 서버 주소를 확인해 주세요.'
            : '카카오 로그인 처리에 실패했습니다.'
        );
        router.push('/login');
      }
    };

    void processLogin();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        <p className="text-sm font-medium text-slate-500">카카오 로그인 처리 중입니다...</p>
      </div>
    </div>
  );
}
