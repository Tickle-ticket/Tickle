import { DetailData } from '@/src/features/detail/api/useDetailData';
import { EventDetailResponse } from '@/src/features/book/api/useEventDetail';
import { SeatAvailabilityResponse } from '@/src/features/book/api/useSeatData';
import { PerformanceData, BannerData } from '@/src/features/home/api/useHomeData';

export const SHADOW_EVENT_ID_AI = '404';
export const SHADOW_EVENT_ID_HUMAN = '405';

export const isShadowMode = (eventId: string | null | undefined) =>
  eventId === SHADOW_EVENT_ID_AI || eventId === SHADOW_EVENT_ID_HUMAN;

const getShadowTitle = (eventId: string) =>
  eventId === SHADOW_EVENT_ID_HUMAN ? 'SSAFY 티켓팅 테스트' : 'AI Shadow - AI';

export const SHADOW_EVENT: PerformanceData = {
  id: SHADOW_EVENT_ID_AI,
  title: 'AI Shadow - AI',
  imageUrl: 'https://images.unsplash.com/photo-1540039155732-6761b54cbaca?w=500&h=750&fit=crop',
  venue: '티클 아레나 (Shadow Mode)',
  date: '2026.05.20 ~ 2026.05.21',
  badges: ['SHADOW', 'TEST'],
};

export const SHADOW_BANNER: BannerData = {
  id: SHADOW_EVENT_ID_AI,
  title: 'AI Shadow - AI',
  subtitle: 'Shadow Mode Test',
  imageUrl: 'https://images.unsplash.com/photo-1540039155732-6761b54cbaca?w=500&h=750&fit=crop',
  venue: '티클 아레나 (Shadow Mode)',
  date: '2026.05.20 ~ 2026.05.21',
};

export const getShadowDetailData = (eventId: string = SHADOW_EVENT_ID_AI): DetailData => ({
  eventId,
  title: getShadowTitle(eventId),
  subTitle: 'Shadow Mode Test',
  imageUrl: 'https://images.unsplash.com/photo-1540039155732-6761b54cbaca?w=500&h=750&fit=crop',
  openDate: '2026-05-01T00:00:00Z',
  waitlistOpenDate: '2026-05-01T00:00:00Z',
  startDate: '2026.05.20',
  endDate: '2026.05.21',
  venue: '티클 아레나 (Shadow Mode)',
  venueAddress: '가상 공간',
  notice: '이 공연은 SHADOW 모드 테스트용입니다.',
  zonePrices: [
    { priceGrade: 'VIP석', price: 154000 },
    { priceGrade: 'R석', price: 132000 },
    { priceGrade: 'S석', price: 110000 },
    { priceGrade: 'A석', price: 99000 },
  ],
  schedules: [
    {
      date: '2026.05.20',
      times: [{ time: '18:00', remainingSeats: [] }],
    },
  ],
  detailImageUrl: '',
  isFavorite: false,
  tags: ['SHADOW', 'TEST'],
});

export const getShadowEventDetail = (eventId: string = SHADOW_EVENT_ID_AI): EventDetailResponse => ({
  eventId,
  title: getShadowTitle(eventId),
  venue: '티클 아레나 (Shadow Mode)',
  date: '2026.05.20 ~ 2026.05.21',
  zonePrices: [
    { priceGrade: 'VIP석', price: 154000 },
    { priceGrade: 'R석', price: 132000 },
    { priceGrade: 'S석', price: 110000 },
    { priceGrade: 'A석', price: 99000 },
  ],
  schedules: [
    {
      date: '2026.05.20',
      times: [
        {
          scheduleId: `${eventId}-1`,
          sessionNo: 1,
          time: '18:00',
          startAt: '2026-05-20T18:00:00Z',
          status: 'ON_SALE',
          salesOpenAt: '2026-05-01T00:00:00Z',
          salesCloseAt: '2026-05-20T17:30:00Z',
          cancellationWaitOpenAt: '2026-05-01T00:00:00Z',
          remainingSeats: [],
        },
      ],
    },
  ],
  notice: '이 공연은 SHADOW 모드 테스트용입니다.',
  openDate: '2026-05-01T00:00:00Z',
  waitlistOpenDate: '2026-05-01T00:00:00Z',
});

export const generateShadowMockSeats = (): SeatAvailabilityResponse => {
  const mockSeats: SeatAvailabilityResponse = {};
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
  let idCounter = 1;

  rows.forEach((row) => {
    for (let i = 1; i <= 20; i++) {
      const isA7_10 = row === 'A' && i >= 7 && i <= 10;
      const isD10_13 = row === 'D' && i >= 10 && i <= 13;
      const alwaysOpen = isA7_10 || isD10_13;

      const isAvailable = alwaysOpen ? true : Math.random() > 0.6;

      const fixedGrade = row <= 'E' ? 'VIP' : row <= 'J' ? 'R' : row <= 'O' ? 'S' : 'A';

      mockSeats[`${row}${i}`] = {
        priceGrade: fixedGrade,
        isAvailable,
        sessionSeatId: idCounter++,
        waitingCount: isAvailable ? 0 : Math.floor(Math.random() * 5),
        waitable: !isAvailable,
      };
    }
  });
  return mockSeats;
};
