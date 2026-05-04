import { useQuery } from '@tanstack/react-query';
import { EventItem, EventRankingItem, fetchEventList, fetchOpeningSoonEvents, fetchRanking } from '@/src/shared/api/eventApi';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';

export interface BannerData {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  venue: string;
  date: string;
}

export interface PerformanceData {
  id: string;
  title: string;
  imageUrl: string;
  venue: string;
  date: string;
  badges: string[];
  openDate?: string;
}

const formatEventDateRange = (eventStartAt: string, eventEndAt: string) => {
  const startDate = new Date(eventStartAt).toLocaleDateString().replace(/\s/g, '');
  const endDate = new Date(eventEndAt).toLocaleDateString().replace(/\s/g, '');

  return `${startDate} ~ ${endDate}`;
};

const mapRankingItemToPerformance = (item: EventRankingItem): PerformanceData => ({
  id: String(item.eventId),
  title: item.eventName,
  imageUrl: item.thumbnailUrl,
  venue: item.venueName,
  date: formatEventDateRange(item.eventStartAt, item.eventEndAt),
  badges: item.tags || [],
});

const mapEventItemToPerformance = (item: EventItem): PerformanceData => ({
  id: String(item.eventId),
  title: item.title,
  imageUrl: item.thumbnailUrl,
  venue: item.venueLocation,
  date: formatEventDateRange(item.eventStartAt, item.eventEndAt),
  badges: item.metadata?.tags || [],
  openDate: item.salesStartAt,
});

// 배너는 백엔드 전용 API가 준비되기 전까지 별도 조회 경로를 사용한다.
export const useHomeBanners = () => {
  return useQuery({
    queryKey: ['homeBanners'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<BannerData[]>>('/api/v1/home/banners');
      return response.data;
    },
    staleTime: 1000,
  });
};

// BE: GET /api/v1/events/ranking -> CategoryRankingResponse
export const useHomeRanking = (categoryId?: number) => {
  return useQuery({
    queryKey: ['homeRanking', categoryId],
    queryFn: async () => {
      try {
        const response = await fetchRanking(categoryId);
        const rankingItems = response.data.rankings.map(mapRankingItemToPerformance);

        if (rankingItems.length > 0) {
          return rankingItems;
        }
      } catch (error) {
        console.warn('Home ranking fallback to event list:', error);
      }

      const response = await fetchEventList({ categoryId, page: 0, size: 20 });
      const now = Date.now();

      return response.data.items
        .filter((item) => !item.salesStartAt || new Date(item.salesStartAt).getTime() <= now)
        .map(mapEventItemToPerformance);
    },
    staleTime: 1000,
  });
};

// BE: GET /api/v1/events/opening-soon -> OpeningSoonEventsResponse
export const useHomeUpcoming = () => {
  return useQuery({
    queryKey: ['homeUpcoming'],
    queryFn: async () => {
      const response = await fetchOpeningSoonEvents();
      return response.data.events.map((item) => ({
        id: String(item.eventId),
        title: item.eventName,
        imageUrl: item.thumbnailUrl,
        venue: item.venueName,
        date: formatEventDateRange(item.eventStartAt, item.eventEndAt),
        badges: item.tags || [],
        openDate: item.salesStartAt,
      }) as PerformanceData);
    },
    staleTime: 1000,
  });
};
