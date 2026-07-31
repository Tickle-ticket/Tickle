'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/src/shared/api/authApi';
import { setAccessToken } from '@/src/shared/api/tokenManager';
import { ApiError } from '@/src/shared/api/types';
import { clearKakaoSignUpToken, setKakaoSignUpToken } from '@/src/shared/lib/kakaoSignupToken';

const readTokensFromHash = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('accessToken');

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
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
      setAccessToken(tokenPayload.accessToken);
      router.replace('/');
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      clearKakaoSignUpToken();
      console.error('Kakao login error:', error, errorDescription);
      alert(errorDescription || '카카오 로그인 중 오류가 발생했습니다.');
      router.replace('/login');
      return;
    }

    if (!code || !state) {
      clearKakaoSignUpToken();
      router.replace('/login');
      return;
    }

    const processLogin = async () => {
      try {
        const response = await authApi.kakaoLogin({ code, state });

        if (!response.data) {
          throw new Error('Kakao login response is missing.');
        }

        if (response.data.isNewUser) {
          setKakaoSignUpToken(response.data.signUpToken);
          router.replace('/signup/kakao');
          return;
        }

        clearKakaoSignUpToken();
        setAccessToken(response.data.accessToken);
        // state는 CSRF 방어용 난수라 경로가 아니다. 이동 경로는 로그인 시작 때
        // 서버가 쿠키에 담아둔 값을 응답으로 돌려준다(api/v1/auth/kakao/login).
        router.replace(response.data.redirectPath ?? '/');
      } catch (err) {
        clearKakaoSignUpToken();
        console.error('Kakao callback failed:', err);
        alert(
          err instanceof ApiError && err.status === 404
            ? '카카오 로그인 API에 연결할 수 없습니다. 인증 서버 주소를 확인해 주세요.'
            : '카카오 로그인 처리에 실패했습니다.'
        );
        router.replace('/login');
      }
    };

    void processLogin();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-blue-500" />
        <p className="text-sm font-medium text-content-tertiary">카카오 로그인을 처리하고 있습니다...</p>
      </div>
    </div>
  );
}
