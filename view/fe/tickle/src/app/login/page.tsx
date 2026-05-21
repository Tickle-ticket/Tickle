import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: '로그인 | Tikkle',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">로딩중...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
