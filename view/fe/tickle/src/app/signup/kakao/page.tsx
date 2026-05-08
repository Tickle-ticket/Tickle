import type { Metadata } from 'next';
import { KakaoSignupPageClient } from './KakaoSignupPageClient';

export const metadata: Metadata = {
  title: '카카오 회원가입 | Tikkle',
};

export default function KakaoSignupPage() {
  return <KakaoSignupPageClient />;
}
