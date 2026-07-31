import { delay, http, HttpResponse } from 'msw';

export const userHandlers = [
  http.get('*/api/v1/users/me', async ({ request }) => {
    await delay(300);
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      // 실제 서버는 본문 없이 끊지 않고 공통 응답 형식을 내려준다(AuthErrorCode).
      return HttpResponse.json(
        { status: 401, code: 'MISSING_TOKEN', message: '인증 토큰이 없습니다.', data: null },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        userId: 1,
        userNo: 'U12345678',
        email: 'user@example.com',
        phoneNumber: '010-1234-5678',
        name: '홍길동',
        nickname: '티클마스터',
        profileImageUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        birthDate: '1990-01-01',
      },
    });
  }),

  http.put('*/api/v1/users/me', async ({ request }) => {
    await delay(300);
    const formData = await request.formData();
    const nickname = formData.get('nickname');
    const phoneNumber = formData.get('phoneNumber');

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        userId: 1,
        userNo: 'U12345678',
        email: 'user@example.com',
        phoneNumber: typeof phoneNumber === 'string' && phoneNumber ? phoneNumber : '010-1234-5678',
        name: '홍길동',
        nickname: typeof nickname === 'string' && nickname ? nickname : '티클마스터',
        profileImageUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        birthDate: '1990-01-01',
      },
    });
  }),

  http.delete('*/api/v1/users/me', async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: null,
    });
  }),
];
