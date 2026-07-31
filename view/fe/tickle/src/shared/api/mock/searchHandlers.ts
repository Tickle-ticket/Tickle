import { http, HttpResponse, delay } from 'msw';

// 검색용 통합 목데이터 (homeHandlers의 BE 스키마 데이터를 PerformanceData 형태로 변환)
const allPerformances = [
  { id: '1', title: '오페라의 유령', imageUrl: 'https://picsum.photos/seed/poster47/800/1200', venue: '샤롯데씨어터', date: '2024.07.26 ~ 2024.11.16', badges: ['뮤지컬', 'HOT'] },
  { id: '2', title: '레미제라블', imageUrl: 'https://picsum.photos/seed/poster48/800/1200', venue: '블루스퀘어 신한카드홀', date: '2024.11.19 ~ 2025.05.18', badges: ['뮤지컬'] },
  { id: '3', title: '위키드', imageUrl: 'https://picsum.photos/seed/poster49/800/1200', venue: '충무아트센터 대극장', date: '2025.01.09 ~ 2025.06.01', badges: ['뮤지컬', 'NEW'] },
  { id: '4', title: '시카고', imageUrl: 'https://picsum.photos/seed/poster50/800/1200', venue: 'D-CUBE 링크아트센터', date: '2024.12.05 ~ 2025.03.02', badges: ['뮤지컬'] },
  { id: '5', title: '알라딘', imageUrl: 'https://picsum.photos/seed/poster51/800/1200', venue: '예술의전당 오페라극장', date: '2025.02.01 ~ 2025.06.30', badges: ['뮤지컬', 'BEST'] },
  { id: '10', title: '캣츠', imageUrl: 'https://picsum.photos/seed/poster52/800/1200', venue: '세종문화회관 대극장', date: '2025.08.01 ~ 2025.10.31', badges: ['뮤지컬'] },
  { id: '11', title: '맘마미아', imageUrl: 'https://picsum.photos/seed/poster53/800/1200', venue: 'LG아트센터 서울', date: '2025.09.15 ~ 2025.12.28', badges: ['뮤지컬', 'NEW'] },
  { id: '12', title: '지킬 앤 하이드', imageUrl: 'https://picsum.photos/seed/poster54/800/1200', venue: '충무아트센터 대극장', date: '2025.07.20 ~ 2025.10.19', badges: ['뮤지컬', 'HOT'] },
  { id: '13', title: '킹키부츠', imageUrl: 'https://picsum.photos/seed/poster55/800/1200', venue: 'D-CUBE 링크아트센터', date: '2025.10.01 ~ 2025.12.31', badges: ['뮤지컬'] },
  { id: '14', title: '헤드윅', imageUrl: 'https://picsum.photos/seed/poster56/800/1200', venue: '대학로 유니플렉스', date: '2025.11.15 ~ 2026.02.28', badges: ['뮤지컬', 'NEW'] },
];

export const searchHandlers = [
  http.get('*/api/v1/search', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() || '';

    if (!query) {
      return HttpResponse.json({
        status: 200,
        code: 'OK',
        message: 'success',
        data: [],
      });
    }

    // '전체' 검색 시 필터링 없이 모든 목록을 반환
    if (query === '전체') {
      return HttpResponse.json({
        status: 200,
        code: 'OK',
        message: 'success',
        data: allPerformances,
      });
    }

    const filtered = allPerformances.filter(
      (perf) =>
        perf.title.toLowerCase().includes(query) ||
        perf.venue.toLowerCase().includes(query) ||
        perf.badges.some((badge) => badge.toLowerCase().includes(query))
    );

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: filtered,
    });
  }),
];
