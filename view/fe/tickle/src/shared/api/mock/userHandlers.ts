import { http, HttpResponse, delay } from 'msw';

export const userHandlers = [
  // 유저 프로필 모킹 API
  http.get('/api/user/profile', async () => {
    await delay(500); // 아바타 스켈레톤 로딩 확인용
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        avatarUrl: '/images/avatar_placeholder.png',
        name: 'Guest User',
      },
    });
  }),
];
