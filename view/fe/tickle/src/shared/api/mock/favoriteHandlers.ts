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
            title: "오페라의 유령",
            venueLocation: "샤롯데씨어터",
            eventStartAt: "2024-07-26T19:30:00Z",
            eventEndAt: "2024-11-16T21:30:00Z",
            categoryName: "뮤지컬",
            thumbnailUrl: "https://i.namu.wiki/i/u4Jy5i1HH21xCnVvPY0FXyC_jYRlt9rorKH95IMVNFdO5ZiFsd6J8JPuPK-JgRUb2Ngu6M-r6vudsw27aZ8yJJeJRz3SDXYHuM326_zq3LevCttDTg8dujFCCFUE4TMUzD2Waez43-6e2j-DZrf-NA.webp",
            metadata: { tags: ["뮤지컬", "HOT"] },
            isFavorite: true
          },
          {
            eventId: 3,
            title: "위키드",
            venueLocation: "충무아트센터 대극장",
            eventStartAt: "2025-01-09T19:30:00Z",
            eventEndAt: "2025-06-01T21:30:00Z",
            categoryName: "뮤지컬",
            thumbnailUrl: "https://ticketimage.interpark.com/Play/image/large/24/24015262_p.gif",
            metadata: { tags: ["뮤지컬", "NEW"] },
            isFavorite: true
          },
          {
            eventId: 20,
            title: "콜드플레이 내한공연",
            venueLocation: "고양종합운동장",
            eventStartAt: "2025-04-16T19:30:00Z",
            eventEndAt: "2025-04-25T21:30:00Z",
            categoryName: "콘서트",
            thumbnailUrl: "https://ticketimage.interpark.com/Play/image/large/24/24013233_p.gif",
            metadata: { tags: ["콘서트", "HOT"] },
            isFavorite: true
          },
          {
            eventId: 30,
            title: "옥탑방 고양이",
            venueLocation: "틴틴홀",
            eventStartAt: "2024-01-01T19:30:00Z",
            eventEndAt: "2025-12-31T21:30:00Z",
            categoryName: "연극",
            thumbnailUrl: "https://ticketimage.interpark.com/Play/image/large/23/23010526_p.gif",
            metadata: { tags: ["연극", "BEST"] },
            isFavorite: true
          },
          {
            eventId: 40,
            title: "유토피아 노웨어",
            venueLocation: "그라운드시소 성수",
            eventStartAt: "2024-03-29T10:00:00Z",
            eventEndAt: "2024-10-13T19:00:00Z",
            categoryName: "전시/행사",
            thumbnailUrl: "https://ticketimage.interpark.com/Play/image/large/24/24003324_p.gif",
            metadata: { tags: ["전시/행사", "BEST"] },
            isFavorite: true
          }
        ],
        page: 0,
        size: 20,
        totalElements: 5,
        totalPages: 1,
        hasNext: false
      }
    });
  })
];
