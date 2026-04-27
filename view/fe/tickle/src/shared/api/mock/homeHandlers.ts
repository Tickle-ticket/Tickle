import { http, HttpResponse, delay } from 'msw';

// 배너 목 데이터
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

// 랭킹 공연 목 데이터
export const rankingPerformances = [
  {
    id: '1',
    title: '오페라의 유령',
    imageUrl: 'https://i.namu.wiki/i/u4Jy5i1HH21xCnVvPY0FXyC_jYRlt9rorKH95IMVNFdO5ZiFsd6J8JPuPK-JgRUb2Ngu6M-r6vudsw27aZ8yJJeJRz3SDXYHuM326_zq3LevCttDTg8dujFCCFUE4TMUzD2Waez43-6e2j-DZrf-NA.webp',
    venue: '샤롯데씨어터',
    date: '2024.07.26 ~ 2024.11.16',
    badges: ['뮤지컬', 'HOT'],
  },
  {
    id: '2',
    title: '레미제라블',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24013956_p.gif',
    venue: '블루스퀘어 신한카드홀',
    date: '2024.11.19 ~ 2025.05.18',
    badges: ['뮤지컬'],
  },
  {
    id: '3',
    title: '위키드',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24015262_p.gif',
    venue: '충무아트센터 대극장',
    date: '2025.01.09 ~ 2025.06.01',
    badges: ['뮤지컬', 'NEW'],
  },
  {
    id: '4',
    title: '시카고',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24014884_p.gif',
    venue: 'D-CUBE 링크아트센터',
    date: '2024.12.05 ~ 2025.03.02',
    badges: ['뮤지컬'],
  },
  {
    id: '5',
    title: '알라딘',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24017162_p.gif',
    venue: '예술의전당 오페라극장',
    date: '2025.02.01 ~ 2025.06.30',
    badges: ['뮤지컬', 'BEST'],
  },
];

// 오픈 예정 공연 목 데이터
export const upcomingPerformances = [
  {
    id: '10',
    title: '캣츠',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24018023_p.gif',
    venue: '세종문화회관 대극장',
    date: '2025.08.01 ~ 2025.10.31',
    openDate: '2026-05-10T12:00:00',
    badges: ['뮤지컬'],
  },
  {
    id: '11',
    title: '맘마미아',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24016571_p.gif',
    venue: 'LG아트센터 서울',
    date: '2025.09.15 ~ 2025.12.28',
    openDate: '2026-05-15T10:00:00',
    badges: ['뮤지컬', 'NEW'],
  },
  {
    id: '12',
    title: '지킬 앤 하이드',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24014090_p.gif',
    venue: '충무아트센터 대극장',
    date: '2025.07.20 ~ 2025.10.19',
    openDate: '2026-05-20T14:00:00',
    badges: ['뮤지컬', 'HOT'],
  },
  {
    id: '13',
    title: '킹키부츠',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24014884_p.gif',
    venue: 'D-CUBE 링크아트센터',
    date: '2025.10.01 ~ 2025.12.31',
    openDate: '2026-06-01T10:00:00',
    badges: ['뮤지컬'],
  },
  {
    id: '14',
    title: '헤드윅',
    imageUrl: 'https://ticketimage.interpark.com/Play/image/large/24/24017162_p.gif',
    venue: '대학로 유니플렉스',
    date: '2025.11.15 ~ 2026.02.28',
    openDate: '2026-06-10T12:00:00',
    badges: ['뮤지컬', 'NEW'],
  },
];

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
  // 홈 배너 목록 API
  http.get('/api/v1/home/banners', async () => {
    await delay(800);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: banners,
    });
  }),

  // 랭킹 공연 목록 API
  http.get('/api/v1/home/ranking', async () => {
    await delay(600);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: rankingPerformances,
    });
  }),

  // 오픈 예정 공연 목록 API
  http.get('/api/v1/home/upcoming', async () => {
    await delay(700);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: upcomingPerformances,
    });
  }),

  // 위시리스트(찜) 토글 API
  http.post('/api/v1/home/wishlist/:eventId', async ({ params }) => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        eventId: params.eventId,
        wishlisted: true,
      },
    });
  }),

  // 마이페이지: 관심 있는 개봉 예정 공연 API
  http.get('/api/v1/mypage/wishlist/upcoming', async () => {
    await delay(500);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: upcomingPerformances.slice(0, 3), // 전체 오픈 예정 공연 중 앞의 3개만 관심 공연으로 노출
    });
  }),

  // 마이페이지: 내 예매 내역 조회 API
  http.get('/api/v1/mypage/bookings', () => {
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: mockBookings,
    });
  }),

  // 마이페이지: 과거 예매 내역 조회 API
  http.get('/api/v1/mypage/bookings/past', () => {
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: mockPastBookings,
    });
  }),

  // 마이페이지: 취소표 대기 내역 조회 API
  http.get('/api/v1/mypage/waitlist', () => {
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: mockWaitlistBookings,
    });
  }),

  // 마이페이지: 내 예매 내역 취소 API
  http.delete('/api/v1/mypage/bookings/:id', ({ params }) => {
    const { id } = params;
    mockBookings = mockBookings.filter((b) => b.id !== id);
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: null,
    });
  }),
];
