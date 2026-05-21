import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignupPageClient } from './SignupPageClient';

export const metadata: Metadata = {
  title: '회원가입 유형 선택 | Tikkle',
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">로딩중...</div>}>
      <SignupPageClient />
    </Suspense>
  );
}
