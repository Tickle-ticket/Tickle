'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authApi } from '@/src/shared/api/authApi';
import { setTokens } from '@/src/shared/api/tokenManager';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { KakaoLoginButton } from '@/src/shared/components/KakaoLoginButton';
import { UserAuthFrame } from '@/src/shared/components/UserAuthFrame';

export function LoginPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        router.push('/');
      }
    } catch (error) {
      console.error('Login failed', error);
      setPasswordError('로그인에 실패했습니다. 이메일과 비밀번호를 다시 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
    window.location.href = `${apiUrl}/api/v1/auth/kakao`;
  };

  return (
    <UserAuthFrame
      activeTab="login"
      compact
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4">
          <Input
            label="이메일"
            type="email"
            name="email"
            placeholder="이메일을 입력하세요."
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
            style={{ letterSpacing: '-0.02em' }}
            className="[&_input]:text-[20px]"
          />

          <Input
            label="비밀번호"
            type="password"
            name="password"
            placeholder="비밀번호를 입력하세요."
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
            style={{ letterSpacing: '-0.02em' }}
            className="[&_input]:text-[20px]"
          />
        </div>

        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex cursor-pointer items-center gap-3 font-medium text-slate-600">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span className="select-none">로그인 상태 유지</span>
          </label>
        </div>

        <div className="grid gap-3">
          <Button type="submit" display="block" size="large" color="dark" isLoading={isLoading}>
            로그인
          </Button>

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
      </form>
    </UserAuthFrame>
  );
}

export default LoginPageClient;
