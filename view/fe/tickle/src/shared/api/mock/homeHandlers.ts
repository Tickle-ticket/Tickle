import { http, HttpResponse, delay } from 'msw';

// 배너 목 데이터 (BE에 전용 엔드포인트 없음 — MSW 전용)
const banners = [
  {
    id: '1',
    title: '오페라의 유령',
    subtitle: 'The Phantom of the Opera',
    imageUrl: 'https://i.namu.wiki/i/u4Jy5i1HH21xCnVvPY0FXyC_jYRlt9rorKH95IMVNFdO5ZiFsd6J8JPuPK-JgRUb2Ngu6M-r6vudsw27aZ8yJJeJRz3SDXYHuM326_zq3LevCttDTg8dujFCCFUE4TMUzD2Waez43-6e2j-DZrf-NA.webp',
    venue: '샤롯데씨어터',
    date: '2024.07.26 ~ 2024.11.16',
  },
  {
    id: '2',
    title: '레미제라블',
    subtitle: 'Les Misérables',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24013956_p.gif',
    venue: '블루스퀘어 신한카드홀',
    date: '2024.11.19 ~ 2025.05.18',
  },
  {
    id: '3',
    title: '위키드',
    subtitle: 'Wicked',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24015262_p.gif',
    venue: '충무아트센터 대극장',
    date: '2025.01.09 ~ 2025.06.01',
  },
];

// BE: GET /api/v1/events/ranking → CategoryRankingResponse
const rankingData = {
  categoryId: null,
  categoryName: '전체',
  rankings: [
    {
      rank: 1,
      eventId: 1,
      eventName: '오페라의 유령',
      venueName: '샤롯데씨어터',
      eventStartAt: '2024-07-26T19:30:00Z',
      eventEndAt: '2024-11-16T21:30:00Z',
      salesStartAt: '2024-06-01T10:00:00Z',
      salesEndAt: '2024-11-15T23:59:59Z',
      thumbnailUrl: 'https://i.namu.wiki/i/u4Jy5i1HH21xCnVvPY0FXyC_jYRlt9rorKH95IMVNFdO5ZiFsd6J8JPuPK-JgRUb2Ngu6M-r6vudsw27aZ8yJJeJRz3SDXYHuM326_zq3LevCttDTg8dujFCCFUE4TMUzD2Waez43-6e2j-DZrf-NA.webp',
      tags: ['뮤지컬', 'HOT'],
      isFavorite: false
    },
    {
      rank: 2,
      eventId: 2,
      eventName: '레미제라블',
      venueName: '블루스퀘어 신한카드홀',
      eventStartAt: '2024-11-19T19:30:00Z',
      eventEndAt: '2025-05-18T21:30:00Z',
      salesStartAt: '2024-10-01T10:00:00Z',
      salesEndAt: '2025-05-17T23:59:59Z',
      thumbnailUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24013956_p.gif',
      tags: ['뮤지컬'],
      isFavorite: false
    },
    {
      rank: 3,
      eventId: 3,
      eventName: '위키드',
      venueName: '충무아트센터 대극장',
      eventStartAt: '2025-01-09T19:30:00Z',
      eventEndAt: '2025-06-01T21:30:00Z',
      salesStartAt: '2024-12-01T10:00:00Z',
      salesEndAt: '2025-05-31T23:59:59Z',
      thumbnailUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24015262_p.gif',
      tags: ['뮤지컬', 'NEW'],
      isFavorite: false
    },
    {
      rank: 4,
      eventId: 4,
      eventName: '시카고',
      venueName: 'D-CUBE 링크아트센터',
      eventStartAt: '2024-12-05T19:30:00Z',
      eventEndAt: '2025-03-02T21:30:00Z',
      salesStartAt: '2024-11-01T10:00:00Z',
      salesEndAt: '2025-03-01T23:59:59Z',
      thumbnailUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24014884_p.gif',
      tags: ['뮤지컬'],
      isFavorite: false
    },
    {
      rank: 5,
      eventId: 5,
      eventName: '알라딘',
      venueName: '예술의전당 오페라극장',
      eventStartAt: '2025-02-01T19:30:00Z',
      eventEndAt: '2025-06-30T21:30:00Z',
      salesStartAt: '2025-01-01T10:00:00Z',
      salesEndAt: '2025-06-29T23:59:59Z',
      thumbnailUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24017162_p.gif',
      tags: ['뮤지컬', 'BEST'],
      isFavorite: false
    },
  ]
};

// BE: GET /api/v1/events/opening-soon → OpeningSoonEventsResponse
const openingSoonData = {
  events: [
    {
      eventId: 10,
      eventName: '캣츠',
      venueName: '세종문화회관 대극장',
      eventStartAt: '2025-08-01T19:30:00Z',
      eventEndAt: '2025-10-31T21:30:00Z',
      salesStartAt: '2026-05-10T12:00:00Z',
      salesEndAt: '2025-10-30T23:59:59Z',
      thumbnailUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24018023_p.gif',
      tags: ['뮤지컬'],
      isFavorite: false
    },
    {
      eventId: 11,
      eventName: '맘마미아',
      venueName: 'LG아트센터 서울',
      eventStartAt: '2025-09-15T19:30:00Z',
      eventEndAt: '2025-12-28T21:30:00Z',
      salesStartAt: '2026-05-15T10:00:00Z',
      salesEndAt: '2025-12-27T23:59:59Z',
      thumbnailUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24016571_p.gif',
      tags: ['뮤지컬', 'NEW'],
      isFavorite: false
    },
    {
      eventId: 12,
      eventName: '지킬 앤 하이드',
      venueName: '충무아트센터 대극장',
      eventStartAt: '2025-07-20T19:30:00Z',
      eventEndAt: '2025-10-19T21:30:00Z',
      salesStartAt: '2026-05-20T14:00:00Z',
      salesEndAt: '2025-10-18T23:59:59Z',
      thumbnailUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24014090_p.gif',
      tags: ['뮤지컬', 'HOT'],
      isFavorite: false
    },
    {
      eventId: 13,
      eventName: '킹키부츠',
      venueName: 'D-CUBE 링크아트센터',
      eventStartAt: '2025-10-01T19:30:00Z',
      eventEndAt: '2025-12-31T21:30:00Z',
      salesStartAt: '2026-06-01T10:00:00Z',
      salesEndAt: '2025-12-30T23:59:59Z',
      thumbnailUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24014884_p.gif',
      tags: ['뮤지컬'],
      isFavorite: false
    },
    {
      eventId: 14,
      eventName: '헤드윅',
      venueName: '대학로 유니플렉스',
      eventStartAt: '2025-11-15T19:30:00Z',
      eventEndAt: '2026-02-28T21:30:00Z',
      salesStartAt: '2026-06-10T12:00:00Z',
      salesEndAt: '2026-02-27T23:59:59Z',
      thumbnailUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24017162_p.gif',
      tags: ['뮤지컬', 'NEW'],
      isFavorite: false
    },
  ]
};

// 마이페이지: 취소표 대기 내역 상태 관리 (모의 데이터)
const mockWaitlistBookings = [
  {
    id: 'waitlist-1',
    imageUrl: 'https://i.namu.wiki/i/u4Jy5i1HH21xCnVvPY0FXyC_jYRlt9rorKH95IMVNFdO5ZiFsd6J8JPuPK-JgRUb2Ngu6M-r6vudsw27aZ8yJJeJRz3SDXYHuM326_zq3LevCttDTg8dujFCCFUE4TMUzD2Waez43-6e2j-DZrf-NA.webp',
    title: '오페라의 유령',
    venue: '샤롯데씨어터',
    performanceDate: '2026-04-23T19:30:00Z',
    waitDate: '2026-04-10',
    seats: [
      { id: 's1', info: 'VIP석 1층 B구역 12열 14번', waitlistNumber: 3 },
      { id: 's2', info: 'VIP석 1층 B구역 12열 15번', waitlistNumber: 4 },
      { id: 's3', info: 'VIP석 1층 B구역 12열 16번', waitlistNumber: 8 },
      { id: 's4', info: 'VIP석 1층 B구역 12열 17번', waitlistNumber: 18 },
    ]
  },
  {
    id: 'waitlist-2',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24013956_p.gif',
    title: '레미제라블',
    venue: '블루스퀘어 신한카드홀',
    performanceDate: '2026-05-18T14:00:00Z',
    waitDate: '2026-04-15',
    seats: [
      { id: 's5', info: 'R석 1층 A구역 8열 10번', waitlistNumber: 24 },
    ]
  }
];

// 마이페이지: 과거 예매 내역 상태 관리 (모의 데이터)
const mockPastBookings = [
  {
    id: 'past-booking-1',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24001150_p.gif',
    title: '지킬 앤 하이드',
    venue: '샤롯데씨어터',
    performanceDate: '2024-05-15T19:30:00Z',
    bookingDate: '2024-03-20',
    seatInfo: 'VIP석 1층 B구역 12열 14번',
    ticketCount: 2,
    status: '관람완료'
  },
  {
    id: 'past-booking-2',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/23/23011311_p.gif',
    title: '레베카',
    venue: '블루스퀘어 신한카드홀',
    performanceDate: '2024-01-20T14:00:00Z',
    bookingDate: '2023-11-01',
    seatInfo: 'R석 2층 A구역 5열 2번',
    ticketCount: 1,
    status: '관람완료'
  }
];

// 마이페이지: 내 예매 내역 상태 관리 (모의 데이터)
// eslint-disable-next-line prefer-const
let mockBookings = [
  {
    id: 'booking-1',
    imageUrl: 'https://images.unsplash.com/photo-1540839045646-19f6368d30e5?w=500&q=80',
    title: '맘마미아',
    venue: 'LG아트센터 서울',
    performanceDate: '2025-09-15T19:30:00Z',
    bookingDate: '2025-03-20',
    seatInfo: 'VIP석 1층 B구역 12열 14번',
    ticketCount: 2,
  },
  {
    id: 'booking-2',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
    title: '오페라의 유령',
    venue: '샤롯데씨어터',
    performanceDate: '2025-08-20T14:00:00Z',
    bookingDate: '2025-04-01',
    seatInfo: 'R석 2층 A구역 5열 2번',
    ticketCount: 1,
  }
];
export const homeHandlers = [
  // 홈 배너 목록 API (BE에 전용 엔드포인트 없음)
  http.get('*/api/v1/home/banners', async () => {
    await delay(800);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: banners,
    });
  }),

  // BE: GET /api/v1/events/ranking → CategoryRankingResponse
  http.get('*/api/v1/events/ranking', async () => {
    await delay(600);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: rankingData,
    });
  }),

  // BE: GET /api/v1/events/opening-soon → OpeningSoonEventsResponse
  http.get('*/api/v1/events/opening-soon', async () => {
    await delay(700);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: openingSoonData,
    });
  }),

  // 마이페이지: 내 예매 내역 조회 API (BE 미구현 — MSW 전용)
  http.get('*/api/v1/mypage/bookings', () => {
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: mockBookings,
    });
  }),

  // 마이페이지: 과거 예매 내역 조회 API (BE 미구현 — MSW 전용)
  http.get('*/api/v1/mypage/bookings/past', () => {
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: mockPastBookings,
    });
  }),

  // 마이페이지: 취소표 대기 내역 조회 API (BE 미구현 — MSW 전용)
  http.get('*/api/v1/mypage/waitlist', () => {
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: mockWaitlistBookings,
    });
  }),

  // 마이페이지: 내 예매 내역 취소 API (BE 미구현 — MSW 전용)
  http.delete('*/api/v1/mypage/bookings/:id', ({ params }) => {
    const { id } = params;
    mockBookings = mockBookings.filter((b) => b.id !== id);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: null,
    });
  }),
];
