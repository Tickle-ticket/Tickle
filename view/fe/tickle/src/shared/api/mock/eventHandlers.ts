import { http, HttpResponse, delay } from 'msw';
import { getMockSeatsForSchedule } from './seatHandlers';

/**
 * 예매 오픈 상태별 시나리오.
 *
 * DetailView는 오픈 시각까지 남은 시간으로 버튼 표시를 네 갈래로 나눈다
 * (isUpcoming · isMoreThanOneDayLeft 조합). eventId로 각 갈래를 바로 열 수 있게
 * 해두면 백엔드 없이도 전부 확인할 수 있다.
 *
 * - `opensInMinutes: null` → 이미 오픈됨(예매 버튼 활성)
 * - 1440분(24시간) 초과 → "N월 N일 오픈" 날짜만 표시
 * - 1440분 이하        → 카운트다운 타이머 표시
 */
type OpenScenario = {
  readonly label: string;
  /** 예매 오픈까지 남은 분. null이면 이미 오픈. */
  readonly opensInMinutes: number | null;
  /** 취소표 대기 오픈까지 남은 분. null이면 이미 오픈. */
  readonly waitlistOpensInMinutes: number | null;
};

const OPEN_SCENARIOS: Record<number, OpenScenario> = {
  // 10 — 예매·대기 모두 12시간 뒤: 두 버튼 다 카운트다운
  10: { label: '예매 대기 테스트 공연', opensInMinutes: 12 * 60, waitlistOpensInMinutes: 12 * 60 + 10 },
  // 11 — 3일 뒤: 카운트다운 대신 날짜만 표시
  11: { label: '오픈 예정 공연 (3일 뒤)', opensInMinutes: 3 * 24 * 60, waitlistOpensInMinutes: 3 * 24 * 60 + 10 },
  // 12 — 2분 뒤: 타이머가 0에 도달해 버튼이 활성화되는 순간을 볼 수 있다
  12: { label: '곧 오픈 공연 (2분 뒤)', opensInMinutes: 2, waitlistOpensInMinutes: 12 },
  // 13 — 예매는 열렸고 대기만 30분 뒤: 두 버튼 상태가 엇갈리는 경우
  13: { label: '예매 중 · 대기 오픈 예정', opensInMinutes: null, waitlistOpensInMinutes: 30 },
  // 999 — 기존 테스트용 별칭(12시간 뒤)
  999: { label: '예매 대기 테스트 공연', opensInMinutes: 12 * 60, waitlistOpensInMinutes: 12 * 60 + 10 },
};

/** 지정한 분만큼 뒤의 ISO 시각을 만든다. */
const minutesFromNow = (now: Date, minutes: number) =>
  new Date(now.getTime() + minutes * 60 * 1000).toISOString();

/** eventId에 해당하는 오픈 시나리오를 고른다. 없으면 이미 오픈된 공연으로 본다. */
const resolveOpenScenario = (eventId: number): OpenScenario =>
  OPEN_SCENARIOS[eventId] ?? {
    label: '오페라의 유령',
    opensInMinutes: null,
    waitlistOpensInMinutes: null,
  };

const buildRemainingSeats = (date: string, time: string) => {
  const scheduleId = `${date}-${time}`;
  const mockSeats = getMockSeatsForSchedule(scheduleId);
  const counts: Record<string, number> = { VIP: 0, R: 0, S: 0, A: 0 };
  Object.values(mockSeats).forEach(seat => {
    if (seat.isAvailable && counts[seat.priceGrade] !== undefined) {
      counts[seat.priceGrade]++;
    }
  });
  return Object.entries(counts).map(([priceGrade, count]) => ({ priceGrade, count }));
};

export const eventHandlers = [
  // 공연장 목록 조회
  http.get('*/api/v1/venues', async () => {
    return HttpResponse.json({
      status: 200,
      code: 'OK',
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
      code: 'OK',
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
    const eventId = Number(params.eventId) || 1;
    const scenario = resolveOpenScenario(eventId);

    const now = new Date();

    // 공연·판매 일정은 현재 시각 기준 상대값으로 만든다.
    // 고정 날짜를 쓰면 그 날이 지난 뒤부터 회차 버튼이 전부 비활성(isPast)이 되어
    // 좌석 선택으로 넘어갈 수 없다(SeatSelectionPanel#isDisabled).
    const daysFromNow = (days: number, hour = 19, minute = 30) => {
      const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      d.setHours(hour, minute, 0, 0);
      return d.toISOString();
    };

    // 예매 오픈 시각. 시나리오에 따라 과거(=오픈됨) 또는 미래(=대기 중)로 둔다.
    const salesOpenAt =
      scenario.opensInMinutes === null
        ? daysFromNow(-30, 10, 0)
        : minutesFromNow(now, scenario.opensInMinutes);

    // 취소표 대기는 예매 오픈보다 늦게 열리는 것이 기본이다(DetailView가 별도 카운트다운을 띄운다).
    const cancellationWaitOpenAt =
      scenario.waitlistOpensInMinutes === null
        ? daysFromNow(-30, 10, 0)
        : minutesFromNow(now, scenario.waitlistOpensInMinutes);

    const salesCloseAt = daysFromNow(29, 17, 0);   // 공연 하루 전 판매 마감
    const session1StartAt = daysFromNow(30, 14, 0);
    const session1EndAt = daysFromNow(30, 16, 30);
    const session2StartAt = daysFromNow(30, 19, 30);
    const session2EndAt = daysFromNow(30, 22, 0);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        eventId: eventId,
        title: scenario.label,
        categoryName: '뮤지컬',
        organizerName: 'SSAFY 18기',
        venueName: scenario.opensInMinutes === null ? '샤롯데씨어터' : '테스트 공연장',
        venueAddress: '서울특별시 송파구 올림픽로 240',
        cityName: '서울',
        timezoneCode: 'Asia/Seoul',
        salesStartAt: salesOpenAt,
        salesEndAt: salesCloseAt,
        eventStartAt: session1StartAt,
        eventEndAt: session2EndAt,
        metadata: {
          tags: scenario.opensInMinutes === null ? ['뮤지컬', 'HOT'] : ['테스트', '오픈예정']
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
            startAt: session1StartAt,
            endAt: session1EndAt,
            salesOpenAt,
            // EventSessionSchema가 필수로 요구하는 필드. 빠지면 스키마 검증에서
            // 응답 전체가 거부되어 화면이 뜨지 않는다.
            cancellationWaitOpenAt,
            salesCloseAt,
            status: 'OPEN'
          },
          {
            sessionId: 102,
            sessionNo: 2,
            startAt: session2StartAt,
            endAt: session2EndAt,
            salesOpenAt,
            cancellationWaitOpenAt,
            salesCloseAt,
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
