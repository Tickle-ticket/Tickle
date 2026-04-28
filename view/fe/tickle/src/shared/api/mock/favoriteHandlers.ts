import { http, HttpResponse, delay } from 'msw';

export const favoriteHandlers = [
  http.post('*/api/v1/events/:eventId/favorite', async ({ params }) => {
    await delay(300);
    return HttpResponse.json({
      status: 201,
      message: 'success',
      data: {
        favoriteId: 100,
        userId: 1,
        eventId: Number(params.eventId),
        createdAt: new Date().toISOString()
      }
    });
  }),
  http.delete('*/api/v1/events/:eventId/favorite', async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: null
    });
  }),
  http.get('*/api/v1/users/me/favorites', async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        items: [
          {
            eventId: 1,
            title: "SSAFY 18기 밴드 공연",
            venueLocation: "서울캠퍼스 대강당",
            eventStartAt: "2026-04-27T10:49:28.431Z",
            eventEndAt: "2026-04-27T12:49:28.431Z",
            categoryName: "콘서트",
            thumbnailUrl: "https://example.com/thumb.jpg",
            metadata: { tags: ["밴드", "SSAFY", "공연"] },
            isFavorite: true
          }
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        hasNext: false
      }
    });
  })
];
