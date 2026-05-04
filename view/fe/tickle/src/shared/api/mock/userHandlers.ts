import { http, HttpResponse, delay } from 'msw';

export const userHandlers = [
  http.get('*/api/v1/users/me', async ({ request }) => {
    await delay(300);
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        userId: 1,
        userNo: 'U12345678',
        email: 'user@example.com',
        phoneNumber: '010-1234-5678',
        name: '홍길동',
        nickname: '티클마스터',
        profileImageUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        birthDate: '1990-01-01'
      }
    });
  }),
  http.patch('*/api/v1/users/me', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as any;
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        userId: 1,
        userNo: 'U12345678',
        email: 'user@example.com',
        phoneNumber: '010-1234-5678',
        name: '홍길동',
        nickname: body.nickname || '수정된닉네임',
        profileImageUrl: body.profileImageUrl || 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        birthDate: '1990-01-01'
      }
    });
  }),
  http.delete('*/api/v1/users/me', async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: null
    });
  })
];
