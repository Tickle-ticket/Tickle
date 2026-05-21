import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignupFormPageClient } from './SignupFormPageClient';
import { isSignupAccountType } from '../signupAccountType';

export const metadata: Metadata = {
  title: '회원가입 정보 입력 | Tikkle',
};

interface SignupFormPageProps {
  searchParams: Promise<{
    type?: string | string[];
  }>;
}

export default async function SignupFormPage({ searchParams }: SignupFormPageProps) {
  const params = await searchParams;
  const accountType = Array.isArray(params.type) ? params.type[0] : params.type;

  if (!isSignupAccountType(accountType)) {
    redirect('/signup');
  }

  return <SignupFormPageClient initialAccountType={accountType} />;
}
