import { NextRequest, NextResponse } from 'next/server';
import { getAuthApiBaseUrl } from '@/src/shared/api/authConfig';
import { KAKAO_OAUTH_STATE_COOKIE_NAME, resolveKakaoRedirectUri } from '@/src/shared/lib/kakaoOAuth';

type KakaoLoginRequestBody = {
  code?: string;
  state?: string;
};

const jsonResponse = (status: number, message: string, data: unknown = null) =>
  NextResponse.json(
    {
      status,
      message,
      data,
    },
    { status }
  );

export async function POST(request: NextRequest) {
  let requestBody: KakaoLoginRequestBody;

  try {
    requestBody = (await request.json()) as KakaoLoginRequestBody;
  } catch {
    return jsonResponse(400, '잘못된 요청입니다.');
  }

  const { code, state } = requestBody;
  if (!code || !state) {
    return jsonResponse(400, '카카오 인가 코드와 state는 필수입니다.');
  }

  const storedState = request.cookies.get(KAKAO_OAUTH_STATE_COOKIE_NAME)?.value;
  if (!storedState || storedState !== state) {
    const response = jsonResponse(400, '유효하지 않은 카카오 로그인 상태값입니다.');
    response.cookies.delete(KAKAO_OAUTH_STATE_COOKIE_NAME);
    return response;
  }

  const authApiBaseUrl = getAuthApiBaseUrl();
  if (!authApiBaseUrl) {
    const response = jsonResponse(500, '인증 서버 주소가 설정되지 않았습니다.');
    response.cookies.delete(KAKAO_OAUTH_STATE_COOKIE_NAME);
    return response;
  }

  const redirectUri = resolveKakaoRedirectUri(new URL(request.url).origin);

  try {
    const backendResponse = await fetch(`${authApiBaseUrl}/api/v1/auth/kakao/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirectUri,
      }),
      cache: 'no-store',
    });

    const responseBody = await backendResponse.json().catch(() => null);
    const proxiedStatus =
      backendResponse.ok && responseBody?.data?.isNewUser === true ? 202 : backendResponse.status;
    const normalizedBody =
      responseBody && typeof responseBody === 'object'
        ? {
            ...responseBody,
            status: proxiedStatus,
          }
        : responseBody;

    const response = NextResponse.json(
      normalizedBody ?? {
        status: proxiedStatus,
        message: backendResponse.ok ? '성공' : '카카오 로그인 처리에 실패했습니다.',
        data: null,
      },
      { status: proxiedStatus }
    );

    response.cookies.delete(KAKAO_OAUTH_STATE_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error('Kakao login proxy failed:', error);
    const response = jsonResponse(500, '카카오 로그인 처리에 실패했습니다.');
    response.cookies.delete(KAKAO_OAUTH_STATE_COOKIE_NAME);
    return response;
  }
}
