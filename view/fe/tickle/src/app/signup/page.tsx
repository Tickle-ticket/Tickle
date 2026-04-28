import type { Metadata } from 'next';
import { SignupPageClient } from './SignupPageClient';

export const metadata: Metadata = {
  title: '회원가입 | Tikkle',
  description: '티클 회원가입 페이지',
};

export default function SignupPage() {
  return <SignupPageClient />;
}
