import { http, HttpResponse, delay } from 'msw';
import { createMockJwt, resolveMockRole } from './mockJwt';

const API_BASE_URL = '*/api/v1/auth';

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

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: { accessToken: createMockJwt(resolveMockRole(body.email)) },
    });
  }),

  http.post(`${API_BASE_URL}/mock-login`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { name?: string; phoneNumber?: string };

    if (!body.name || !/^010\d{8}$/.test(body.phoneNumber || '')) {
      return HttpResponse.json({ status: 400, code: 'INVALID_INPUT_VALUE', message: '이름과 전화번호를 확인해주세요.' }, { status: 400 });
    }

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: { accessToken: createMockJwt('USER') },
    });
  }),

  // 자체 회원가입
  http.post(`${API_BASE_URL}/signup`, async ({ request }) => {
    await delay(300);
    const body = (await request.json().catch(() => null)) as { email?: string } | null;

    return HttpResponse.json({
      status: 201,
      code: 'CREATED',
      message: '성공',
      data: { accessToken: createMockJwt(resolveMockRole(body?.email)) },
    });
  }),

  // 로그아웃
  http.post(`${API_BASE_URL}/logout`, async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: null,
    });
  }),

  // 토큰 재발급
  // 실제 서버는 HttpOnly refreshToken 쿠키를 읽어 검증하지만(AuthController#reissue),
  // mock에서는 쿠키를 발급하지 않으므로 항상 성공시킨다.
  http.post(`${API_BASE_URL}/reissue`, async () => {
    await delay(200);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: { accessToken: createMockJwt('USER') },
    });
  }),

  // 카카오 로그인 (리다이렉트 모킹 - 백엔드와 유사하게 바로 콜백으로 넘기는 건 브라우저 레벨에서 처리되지만 API 호출일 경우)
  http.get(`${API_BASE_URL}/kakao`, async () => {
    await delay(200);
    // 실제로는 백엔드가 302 Found로 카카오 로그인 페이지를 넘겨주지만, 모킹에선 무시되거나 JSON 에러가 날 수 있음
    return HttpResponse.json({ status: 200, code: 'OK', message: '카카오 로그인 리다이렉트 URL 요청' });
  }),

  // 카카오 로그인 콜백
  http.get(`${API_BASE_URL}/kakao/callback`, async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return HttpResponse.json({ status: 400, code: 'INVALID_REQUEST', message: '카카오 인가 코드가 필요합니다.' }, { status: 400 });
    }

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: { accessToken: createMockJwt('USER') },
    });
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
