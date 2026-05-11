import { useQuery } from '@tanstack/react-query';
import { fetchEventList, fetchOpeningSoonEvents, fetchRanking, fetchCategories } from '@/src/shared/api/eventApi';
import type { EventItem, EventRankingItem } from '@/src/shared/api/types/event.types';
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
  imageUrl: item.thumbnailUrl || '',
  venue: item.venueName,
  date: formatEventDateRange(item.eventStartAt, item.eventEndAt),
  badges: item.tags ? [...item.tags] : [],
});

const mapEventItemToPerformance = (item: EventItem): PerformanceData => ({
  id: String(item.eventId),
  title: item.title,
  imageUrl: item.thumbnailUrl || '',
  venue: item.venueLocation,
  date: formatEventDateRange(item.eventStartAt, item.eventEndAt),
  badges: item.metadata?.tags ? [...item.metadata.tags] : [],
  openDate: item.salesStartAt,
});

export const useHomeBanners = () => {
  return useQuery({
    queryKey: ['homeBanners'],
    queryFn: async () => {
      // 1. 카테고리 목록 조회
      const categoriesResponse = await fetchCategories();
      const categories = categoriesResponse.data.categories;

      // 2. 전체 랭킹 1위 및 각 카테고리별 랭킹 1위 조회 (병렬)
      const rankingPromises = [
        fetchRanking(undefined), // 전체 랭킹
        ...categories.map((category) => fetchRanking(category.categoryId))
      ];
      const rankingResponses = await Promise.allSettled(rankingPromises);

      const banners: BannerData[] = [];

      rankingResponses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          // index 0은 전체, 그 이후는 categories[index - 1]
          const categoryName = index === 0 ? '전체' : categories[index - 1].categoryName;
          const topRanking = result.value.data.rankings?.[0];

          if (topRanking) {
            banners.push({
              id: String(topRanking.eventId),
              title: topRanking.eventName,
              subtitle: `${categoryName} 랭킹 1위`,
              imageUrl: topRanking.thumbnailUrl || '',
              venue: topRanking.venueName,
              date: formatEventDateRange(topRanking.eventStartAt, topRanking.eventEndAt)
            });
          }
        }
      });

      return banners;
    },
    staleTime: 1000 * 60 * 5, // 5분
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
        imageUrl: item.thumbnailUrl || '',
        venue: item.venueName,
        date: formatEventDateRange(item.eventStartAt, item.eventEndAt),
        badges: item.tags ? [...item.tags] : [],
        openDate: item.salesStartAt,
      }) as PerformanceData);
    },
    staleTime: 1000,
  });
};

export const useHomeCategories = () => {
  return useQuery({
    queryKey: ['homeCategories'],
    queryFn: async () => {
      const response = await fetchCategories();
      return response.data.categories;
    },
    staleTime: 1000 * 60 * 60, // 1시간
  });
};
