import { http, HttpResponse, delay } from 'msw';
import { createMockJwt, resolveMockRole } from './mockJwt';

const API_BASE_URL = '*/api/v1/auth';

/**
 * 실제 서버(AuthController#createRefreshTokenCookie)와 같은 형태의 리프레시 쿠키.
 *
 * <p>액세스 토큰은 응답 Body로, 리프레시 토큰은 HttpOnly 쿠키로 나가는 구조를
 * 로컬에서도 그대로 재현한다. FE가 토큰을 메모리에만 두고 새로고침 시 쿠키로
 * 복구하므로, mock이 쿠키를 안 주면 그 흐름을 로컬에서 확인할 수 없다.</p>
 *
 * <p>Secure는 빼야 한다. 로컬은 http라 Secure 쿠키가 저장되지 않는다.</p>
 */
const REFRESH_TOKEN_COOKIE =
  'refreshToken=mock-refresh-token; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=604800';

/** 로그인 성공 응답. 실제 서버처럼 Body(액세스) + Set-Cookie(리프레시)를 함께 보낸다. */
const authSuccess = (accessToken: string, status = 200, code = 'OK') =>
  HttpResponse.json(
    { status, code, message: '성공', data: { accessToken } },
    { status, headers: { 'Set-Cookie': REFRESH_TOKEN_COOKIE } },
  );

/**
 * mock에는 계정 저장소가 없다. 아무 이메일/비밀번호나 통과시키고 항상 같은
 * 사용자로 로그인시킨다. 다만 토큰은 파싱 가능한 JWT 형태여야 하고(tokenClaims),
 * 권한은 이메일 접두사로 고른다(mockJwt#resolveMockRole).
 */
export const authHandlers = [
  // 자체 로그인
  http.post(`${API_BASE_URL}/login`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return HttpResponse.json(
        { status: 400, code: 'INVALID_INPUT_VALUE', message: '이메일과 비밀번호를 모두 입력해주세요.' },
        { status: 400 },
      );
    }

    // 간단한 모의 로그인 체크 (비밀번호가 'error' 이면 에러 반환)
    if (body.password === 'error') {
      return HttpResponse.json(
        { status: 401, code: 'INVALID_PASSWORD', message: '비밀번호가 일치하지 않습니다.' },
        { status: 401 },
      );
    }

    return authSuccess(createMockJwt(resolveMockRole(body.email)));
  }),

  http.post(`${API_BASE_URL}/mock-login`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { name?: string; phoneNumber?: string };

    if (!body.name || !/^010\d{8}$/.test(body.phoneNumber || '')) {
      return HttpResponse.json({ status: 400, code: 'INVALID_INPUT_VALUE', message: '이름과 전화번호를 확인해주세요.' }, { status: 400 });
    }

    return authSuccess(createMockJwt('USER'));
  }),

  // 자체 회원가입
  http.post(`${API_BASE_URL}/signup`, async ({ request }) => {
    await delay(300);
    const body = (await request.json().catch(() => null)) as { email?: string } | null;

    return authSuccess(createMockJwt(resolveMockRole(body?.email)), 201, 'CREATED');
  }),

  // 로그아웃 — 실제 서버(AuthController#deleteRefreshTokenCookie)처럼 쿠키를 만료시킨다.
  http.post(`${API_BASE_URL}/logout`, async () => {
    await delay(300);
    return HttpResponse.json(
      { status: 200, code: 'OK', message: '성공', data: null },
      {
        headers: {
          'Set-Cookie':
            'refreshToken=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=0',
        },
      },
    );
  }),

  // 토큰 재발급
  //
  // 실제 서버는 HttpOnly refreshToken 쿠키를 검증하지만, mock에는 세션 저장소가
  // 없으므로 쿠키 유무와 무관하게 항상 성공시킨다(로컬에서 로그인 상태를 유지하기
  // 위한 의도된 단순화). 다만 실제 서버처럼 쿠키를 새로 내려 Rotation은 흉내 낸다.
  http.post(`${API_BASE_URL}/reissue`, async () => {
    await delay(200);
    return authSuccess(createMockJwt('USER'));
  }),

  // 카카오 로그인 (리다이렉트 모킹 - 백엔드와 유사하게 바로 콜백으로 넘기는 건 브라우저 레벨에서 처리되지만 API 호출일 경우)
  http.get(`${API_BASE_URL}/kakao`, async () => {
    await delay(200);
    // 실제로는 백엔드가 302 Found로 카카오 로그인 페이지를 넘겨주지만, 모킹에선 무시되거나 JSON 에러가 날 수 있음
    return HttpResponse.json({ status: 200, code: 'OK', message: '카카오 로그인 리다이렉트 URL 요청' });
  }),

  // 카카오 신규 가입 완료
  //
  // 카카오로 처음 들어온 사용자가 전화번호 등을 채우면 호출된다. 로컬에서는
  // 흐름만 이어지도록 바로 토큰을 발급한다.
  http.post(`${API_BASE_URL}/kakao/signup`, async () => {
    await delay(300);
    return authSuccess(createMockJwt('USER'), 201, 'CREATED');
  }),

  // 카카오 로그인 콜백
  http.get(`${API_BASE_URL}/kakao/callback`, async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return HttpResponse.json({ status: 400, code: 'INVALID_REQUEST', message: '카카오 인가 코드가 필요합니다.' }, { status: 400 });
    }

    return authSuccess(createMockJwt('USER'));
  }),

  // 휴대폰 인증 발송
  http.post(`${API_BASE_URL}/phone/send`, async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: null,
    });
  }),

  // 휴대폰 인증 확인
  http.post(`${API_BASE_URL}/phone/verify`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { code?: string };

    if (body.code !== '123456') {
      return HttpResponse.json({ status: 400, code: 'PHONE_VERIFICATION_FAILED', message: '인증 코드가 올바르지 않거나 만료되었습니다.' }, { status: 400 });
    }

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: null,
    });
  }),
];
