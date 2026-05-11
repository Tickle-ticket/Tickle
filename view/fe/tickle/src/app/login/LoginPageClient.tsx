'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { authApi } from '@/src/shared/api/authApi';
import { setTokens } from '@/src/shared/api/tokenManager';
import { ApiError } from '@/src/shared/api/types';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { KakaoLoginButton } from '@/src/shared/components/KakaoLoginButton';
import { type AuthNavigationItem, UserAuthFrame } from '@/src/shared/components/UserAuthFrame';
import { clearKakaoSignUpToken } from '@/src/shared/lib/kakaoSignupToken';

type LoginMode = 'audience' | 'agency';

const resolveLoginMode = (value: string | null): LoginMode => (value === 'agency' ? 'agency' : 'audience');

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use the URL mode param as the initial value. In Storybook, prefer window.location.search.
  const storybookMode =
    typeof window !== 'undefined' && window.parent !== window
      ? new URLSearchParams(window.location.search).get('mode')
      : null;
  const initialMode = resolveLoginMode(storybookMode || searchParams.get('mode'));
  const [loginMode, setLoginMode] = useState<LoginMode>(initialMode);

  const redirect = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const authTabs = useMemo<AuthNavigationItem[]>(
    () => [
      {
        key: 'audience',
        label: '일반 회원',
        active: loginMode === 'audience',
        onClick: () => {
          setLoginMode('audience');
          router.push('/login');
        },
      },
      {
        key: 'agency',
        label: '기획사',
        active: loginMode === 'agency',
        onClick: () => {
          setLoginMode('agency');
          router.push('/login?mode=agency');
        },
      },
      {
        key: 'signup',
        label: '회원가입',
        href: '/signup',
        active: false,
      },
    ],
    [loginMode, router]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError('');
    setPasswordError('');

    let hasError = false;

    if (!email) {
      setEmailError('이메일을 입력해 주세요.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('올바른 이메일 형식을 입력해 주세요.');
      hasError = true;
    }

    if (!password) {
      setPasswordError('비밀번호를 입력해 주세요.');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password });

      if (response.data) {
        setTokens(response.data.accessToken, response.data.refreshToken);
        const targetUrl = redirect && redirect.startsWith('/') ? redirect : '/';
        router.push(targetUrl);
      }
    } catch (error) {
      console.error('Login failed', error);
      setPasswordError(
        error instanceof ApiError && error.status === 404
          ? '로그인 API에 연결할 수 없습니다. 인증 서버 주소를 확인해 주세요.'
          : '로그인에 실패했습니다. 이메일과 비밀번호를 다시 확인해 주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    clearKakaoSignUpToken();
    const kakaoUrl = redirect && redirect.startsWith('/')
      ? `/oauth/kakao?redirect=${encodeURIComponent(redirect)}`
      : '/oauth/kakao';
    window.location.href = kakaoUrl;
  };

  return (
    <UserAuthFrame activeTab="login" size="wide" compact authTabs={authTabs}>
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5">
          <Input
            label="이메일"
            type="email"
            name="email"
            placeholder="이메일을 입력해 주세요."
            autoComplete="email"
            fullWidth
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) {
                setEmailError('');
              }
            }}
            error={emailError}
          />

          <Input
            label="비밀번호"
            type="password"
            name="password"
            placeholder="비밀번호를 입력해 주세요."
            autoComplete="current-password"
            fullWidth
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) {
                setPasswordError('');
              }
            }}
            error={passwordError}
          />
        </div>

        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex cursor-pointer items-center gap-3 font-medium text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="select-none">로그인 상태 유지</span>
          </label>
        </div>

        <div className="mt-10 grid gap-4">
          <Button type="submit" display="block" size="xlarge" color="dark" isLoading={isLoading}>
            로그인
          </Button>

          <div className="min-h-[116px]">
            {loginMode === 'audience' ? (
              <div className="grid gap-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm font-medium leading-6">
                    <span className="bg-white px-4 text-slate-500">또는</span>
                  </div>
                </div>

                <KakaoLoginButton onClick={handleKakaoLogin} />
              </div>
            ) : (
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium leading-6 text-slate-500">
                기획사 계정은 이메일 로그인만 지원합니다. 카카오 로그인은 일반 회원 탭에서만 사용할 수 있습니다.
              </div>
            )}
          </div>
        </div>
      </form>
    </UserAuthFrame>
  );
}

export default LoginPageClient;
