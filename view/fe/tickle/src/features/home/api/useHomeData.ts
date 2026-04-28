import { useQuery } from '@tanstack/react-query';
import { fetchRanking, fetchOpeningSoonEvents } from '@/src/shared/api/eventApi';
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

// 배너는 아직 백엔드에 전용 엔드포인트가 없으므로 기존 MSW 유지
export const useHomeBanners = () => {
  return useQuery({
    queryKey: ['homeBanners'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<BannerData[]>>('/api/v1/home/banners');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// BE: GET /api/v1/events/ranking → CategoryRankingResponse
export const useHomeRanking = (categoryId?: number) => {
  return useQuery({
    queryKey: ['homeRanking', categoryId],
    queryFn: async () => {
      const response = await fetchRanking(categoryId);
      const data = response.data;
      return data.rankings.map((item) => {
        const startDate = new Date(item.eventStartAt).toLocaleDateString().replace(/\s/g, '');
        const endDate = new Date(item.eventEndAt).toLocaleDateString().replace(/\s/g, '');
        return {
          id: String(item.eventId),
          title: item.eventName,
          imageUrl: item.thumbnailUrl,
          venue: item.venueName,
          date: `${startDate} ~ ${endDate}`,
          badges: item.tags || [],
        } as PerformanceData;
      });
    },
    staleTime: 1000,
  });
};

// BE: GET /api/v1/events/opening-soon → OpeningSoonEventsResponse
export const useHomeUpcoming = () => {
  return useQuery({
    queryKey: ['homeUpcoming'],
    queryFn: async () => {
      const response = await fetchOpeningSoonEvents();
      const data = response.data;
      return data.events.map((item) => {
        const startDate = new Date(item.eventStartAt).toLocaleDateString().replace(/\s/g, '');
        const endDate = new Date(item.eventEndAt).toLocaleDateString().replace(/\s/g, '');
        return {
          id: String(item.eventId),
          title: item.eventName,
          imageUrl: item.thumbnailUrl,
          venue: item.venueName,
          date: `${startDate} ~ ${endDate}`,
          badges: item.tags || [],
          openDate: item.salesStartAt,
        } as PerformanceData;
      });
    },
    staleTime: 1000,
  });
};
