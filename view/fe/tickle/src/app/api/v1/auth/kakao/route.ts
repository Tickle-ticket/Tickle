import { NextRequest, NextResponse } from 'next/server';
import {
  buildKakaoAuthorizeUrl,
  KAKAO_OAUTH_STATE_COOKIE_NAME,
  resolveKakaoRedirectUri,
  resolveKakaoRequestOrigin,
} from '@/src/shared/lib/kakaoOAuth';

const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = resolveKakaoRequestOrigin(request.url, request.headers);
  
  // redirect 파라미터가 있고 /로 시작하면 state로 사용, 아니면 / 사용
  const redirectParam = url.searchParams.get('redirect');
  const state = (redirectParam && redirectParam.startsWith('/')) ? redirectParam : '/';
  
  const redirectUri = resolveKakaoRedirectUri(origin);
  const authorizeUrl = buildKakaoAuthorizeUrl({ state, redirectUri });

  const response = NextResponse.redirect(authorizeUrl);
  
  // CSRF 용도는 약화되었지만, 기존의 상태 유지를 위해 동일하게 쿠키에 저장할 수도 있습니다.
  // (이번 요구사항에서는 상태 검증보다 리디렉션 목적이 강하므로 쿠키 세팅은 유지)
  response.cookies.set(KAKAO_OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https:'),
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });

  return response;
}
