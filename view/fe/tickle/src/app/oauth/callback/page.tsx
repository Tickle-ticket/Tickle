import type { Metadata } from 'next';
import { KakaoCallbackClient } from '@/src/app/login/kakao/callback/KakaoCallbackClient';

export const metadata: Metadata = {
  title: '카카오 로그인 처리중 | Tikkle',
};

export default function OAuthCallbackPage() {
  return <KakaoCallbackClient />;
}
