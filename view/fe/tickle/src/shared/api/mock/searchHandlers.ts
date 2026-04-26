import { http, HttpResponse, delay } from 'msw';
import { rankingPerformances, upcomingPerformances } from './homeHandlers';

export const searchHandlers = [
  http.get('/api/v1/search', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() || '';

    // Combine both mock databases for search
    const allPerformances = [...rankingPerformances, ...upcomingPerformances];

    if (!query) {
      return HttpResponse.json({
        status: 200,
        message: 'success',
        data: [],
      });
    }

    // '전체' 검색 시 필터링 없이 모든 목록을 반환
    if (query === '전체') {
      return HttpResponse.json({
        status: 200,
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
      message: 'success',
      data: filtered,
    });
  }),
];
