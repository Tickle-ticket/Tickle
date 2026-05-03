import type { Metadata } from 'next';
import { KakaoCallbackClient } from './KakaoCallbackClient';

export const metadata: Metadata = {
  title: '카카오 로그인 처리중 | Tikkle',
};

export default function KakaoCallbackPage() {
  return <KakaoCallbackClient />;
}
