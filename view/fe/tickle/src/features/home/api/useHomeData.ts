import { useQuery } from '@tanstack/react-query';
import { fetchEventList, fetchOpeningSoonEvents, fetchRanking, fetchCategories } from '@/src/shared/api/eventApi';
import type { EventItem, EventRankingItem } from '@/src/shared/api/types/event.types';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';
import { useCategories } from '@/src/shared/api/useCategories';

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

      // 2. 각 카테고리별 랭킹 1위 조회 (병렬)
      const rankingPromises = categories.map((category) => fetchRanking(category.categoryId));
      const rankingResponses = await Promise.allSettled(rankingPromises);

      const banners: BannerData[] = [];

      rankingResponses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const categoryName = categories[index].categoryName;
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
        return (response.data.rankings || []).map(mapRankingItemToPerformance);
      } catch (error) {
        console.error('Failed to fetch home ranking:', error);
        return [];
      }
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

/**
 * 홈 화면 카테고리 목록.
 *
 * <p>공용 {@link useCategories}를 그대로 쓴다. 홈·검색·기획사가 같은 목록을
 * 보므로 캐시를 나눌 이유가 없다.</p>
 */
export const useHomeCategories = useCategories;
