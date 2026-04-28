import type { Metadata } from 'next';
import { SignupPageClient } from './SignupPageClient';

export const metadata: Metadata = {
  title: '회원가입 유형 선택 | Tikkle',
};

export default function SignupPage() {
  return <SignupPageClient />;
}
