import { NextRequest, NextResponse } from 'next/server';
import {
  buildKakaoAuthorizeUrl,
  generateKakaoOAuthState,
  KAKAO_OAUTH_REDIRECT_COOKIE_NAME,
  KAKAO_OAUTH_STATE_COOKIE_NAME,
  resolveKakaoRedirectUri,
  resolveKakaoRequestOrigin,
  sanitizeKakaoRedirectPath,
} from '@/src/shared/lib/kakaoOAuth';

const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = resolveKakaoRequestOrigin(request.url, request.headers);

  // state는 CSRF 방어 전용 난수다. 로그인 후 이동할 경로를 여기에 실으면
  // 값이 '/'처럼 뻔해져 콜백의 state 검증을 누구나 통과할 수 있다.
  const state = generateKakaoOAuthState();
  const redirectPath = sanitizeKakaoRedirectPath(url.searchParams.get('redirect'));

  const redirectUri = resolveKakaoRedirectUri(origin);
  const authorizeUrl = buildKakaoAuthorizeUrl({ state, redirectUri });

  const response = NextResponse.redirect(authorizeUrl);

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: origin.startsWith('https:'),
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  };

  response.cookies.set(KAKAO_OAUTH_STATE_COOKIE_NAME, state, cookieOptions);
  // 이동 경로는 별도 쿠키로 나른다. 카카오를 거치지 않으므로 위조될 여지가 없다.
  response.cookies.set(KAKAO_OAUTH_REDIRECT_COOKIE_NAME, redirectPath, cookieOptions);

  return response;
}
