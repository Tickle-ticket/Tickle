import { NextRequest, NextResponse } from 'next/server';
import {
  buildKakaoAuthorizeUrl,
  generateKakaoOAuthState,
  KAKAO_OAUTH_STATE_COOKIE_NAME,
  resolveKakaoRedirectUri,
} from '@/src/shared/lib/kakaoOAuth';

const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const state = generateKakaoOAuthState();
  const redirectUri = resolveKakaoRedirectUri(origin);
  const authorizeUrl = buildKakaoAuthorizeUrl({ state, redirectUri });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(KAKAO_OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: new URL(request.url).protocol === 'https:',
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });

  return response;
}
