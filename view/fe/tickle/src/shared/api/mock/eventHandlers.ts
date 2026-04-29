import { http, HttpResponse, delay } from 'msw';
import { getMockSeatsForSchedule } from './seatHandlers';

const buildRemainingSeats = (date: string, time: string) => {
  const scheduleId = `${date}-${time}`;
  const mockSeats = getMockSeatsForSchedule(scheduleId);
  const counts: Record<string, number> = { VIP: 0, R: 0, S: 0, A: 0 };
  Object.values(mockSeats).forEach(seat => {
    if (seat.isAvailable && counts[seat.grade] !== undefined) {
      counts[seat.grade]++;
    }
  });
  return Object.entries(counts).map(([grade, count]) => ({ grade, count }));
};

export const eventHandlers = [
  // 공연장 목록 조회
  http.get('*/api/v1/venues', async () => {
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        venues: [
          { venueId: 1, venueName: '샤롯데씨어터' },
          { venueId: 18, venueName: 'SSAFY 18기 대강당' },
        ]
      }
    });
  }),
  // 공연 목록 조회 / 검색 API
  http.get('*/api/v1/events', async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword');
    const page = url.searchParams.get('page') || '0';

    return HttpResponse.json({
      status: 200, // or 0 based on backend success code, Swagger said 0
      message: 'success',
      data: {
        items: [
          {
            eventId: 1,
            title: keyword ? `[검색됨] ${keyword}` : "SSAFY 18기 밴드 공연",
            venueLocation: "서울캠퍼스 대강당",
            eventStartAt: "2026-04-27T10:49:28.431Z",
            eventEndAt: "2026-04-27T12:49:28.431Z",
            categoryName: "콘서트",
            thumbnailUrl: "https://picsum.photos/seed/poster0/800/1200",
            metadata: {
              tags: ["밴드", "SSAFY", "공연"]
            },
            isFavorite: true
          }
        ],
        page: Number(page),
        size: 20,
        totalElements: 1,
        totalPages: 1,
        hasNext: false
      }
    });
  }),

  // 신규 API 명세에 맞춘 공연 상세 조회
  http.get('*/api/v1/events/:eventId', async ({ params }) => {
    // 실제 서버 통신처럼 약간의 지연 시간 추가 (Skeleton 확인용)
    await delay(1000);

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        eventId: Number(params.eventId),
        title: '오페라의 유령',
        categoryName: '뮤지컬',
        organizerName: 'SSAFY 18기',
        venueName: '샤롯데씨어터',
        venueAddress: '서울특별시 송파구 올림픽로 240',
        cityName: '서울',
        timezoneCode: 'Asia/Seoul',
        salesStartAt: '2026-04-01T10:00:00Z',
        salesEndAt: '2026-04-30T23:59:59Z',
        eventStartAt: '2026-04-20T19:30:00Z',
        eventEndAt: '2026-04-30T21:30:00Z',
        metadata: {
          tags: ['뮤지컬', 'HOT']
        },
        notice: '관람등급: 만 13세 이상 관람가\n러닝타임: 총 러닝타임 약 150분 (인터미션 15분 포함)\n취소정책: 관람일 1일 전 17시까지 취소 가능\n주차 및 발렛파킹 불가 (대중교통 이용 권장)\n공연 시작 후 입장 제한',
        status: 'OPEN',
        isFavorite: false,
        images: [
          {
            eventImageId: 1,
            imageType: 'THUMBNAIL',
            imageUrl: 'https://picsum.photos/seed/poster1/800/1200',
            displayOrder: 1
          },
          {
            eventImageId: 2,
            imageType: 'DETAIL',
            imageUrl: 'https://picsum.photos/seed/poster2/800/1200',
            displayOrder: 2
          }
        ],
        sessions: [
          {
            sessionId: 101,
            sessionNo: 1,
            startAt: '2026-04-23T14:00:00Z',
            endAt: '2026-04-23T16:30:00Z',
            salesOpenAt: '2026-04-01T10:00:00Z',
            salesCloseAt: '2026-04-22T17:00:00Z',
            status: 'OPEN'
          },
          {
            sessionId: 102,
            sessionNo: 2,
            startAt: '2026-04-23T19:30:00Z',
            endAt: '2026-04-23T22:00:00Z',
            salesOpenAt: '2026-04-01T10:00:00Z',
            salesCloseAt: '2026-04-22T17:00:00Z',
            status: 'OPEN'
          }
        ],
        pricePolicies: [
          {
            eventPricePolicyId: 1, priceGrade: 'VIP', audienceType: 'ALL', salePriceAmount: 170000, currencyCode: 'KRW', displayOrder: 1,
            discountInfo: [
              { discountName: '일반', discountRate: 0, actualPriceAmount: 170000 },
              { discountName: '청소년 할인', discountRate: 20, actualPriceAmount: 136000 },
              { discountName: '장애인/국가유공자 할인', discountRate: 50, actualPriceAmount: 85000 }
            ]
          },
          {
            eventPricePolicyId: 2, priceGrade: 'R', audienceType: 'ALL', salePriceAmount: 140000, currencyCode: 'KRW', displayOrder: 2,
            discountInfo: [
              { discountName: '일반', discountRate: 0, actualPriceAmount: 140000 },
              { discountName: '청소년 할인', discountRate: 20, actualPriceAmount: 112000 },
              { discountName: '장애인/국가유공자 할인', discountRate: 50, actualPriceAmount: 70000 }
            ]
          },
          {
            eventPricePolicyId: 3, priceGrade: 'S', audienceType: 'ALL', salePriceAmount: 110000, currencyCode: 'KRW', displayOrder: 3,
            discountInfo: [
              { discountName: '일반', discountRate: 0, actualPriceAmount: 110000 },
              { discountName: '청소년 할인', discountRate: 20, actualPriceAmount: 88000 },
              { discountName: '장애인/국가유공자 할인', discountRate: 50, actualPriceAmount: 55000 }
            ]
          },
          {
            eventPricePolicyId: 4, priceGrade: 'A', audienceType: 'ALL', salePriceAmount: 80000, currencyCode: 'KRW', displayOrder: 4,
            discountInfo: [
              { discountName: '일반', discountRate: 0, actualPriceAmount: 80000 },
              { discountName: '청소년 할인', discountRate: 20, actualPriceAmount: 64000 },
              { discountName: '장애인/국가유공자 할인', discountRate: 50, actualPriceAmount: 40000 }
            ]
          }
        ]
      },
    });
  }),
];
