import { useQuery } from '@tanstack/react-query';
import { fetchEventList } from '@/src/shared/api/eventApi';
import { useCategories } from '@/src/shared/api/useCategories';
import type { EventListRequestParams } from '@/src/shared/api/types/event.types';

export interface SearchPerformance {
  id: string;
  title: string;
  imageUrl: string;
  venue: string;
  date: string;
  openDate?: string;
  badges: string[];
}

export const useSearchData = (query: string) => {
  // 카테고리는 공용 쿼리로 받는다. queryFn 안에서 부르면 검색할 때마다 같은
  // 목록을 다시 가져온다.
  const { data: categories } = useCategories();

  return useQuery({
    queryKey: ['search', query, categories?.length ?? 0],
    queryFn: async () => {
      if (!query.trim()) return [];

      const params: EventListRequestParams = { size: 20, page: 0 };
      if (query !== '전체') {
        // 검색어가 카테고리 이름과 정확히 같으면 카테고리 검색, 아니면 키워드
        // 검색으로 넘긴다. 목록을 못 받았을 때도 키워드로 떨어진다.
        const matchedCategory = categories?.find((c) => c.categoryName === query);

        if (matchedCategory) {
          params.categoryId = matchedCategory.categoryId;
        } else {
          params.keyword = query;
        }
      }

      const res = await fetchEventList(params);
      
      return res.data.items.map((item) => {
        const isOpeningSoon = item.salesStartAt && new Date(item.salesStartAt).getTime() > Date.now();
        return {
          id: String(item.eventId),
          title: item.title,
          imageUrl: item.thumbnailUrl,
          venue: item.venueLocation,
          date: `${new Date(item.eventStartAt).toLocaleDateString()} ~ ${new Date(item.eventEndAt).toLocaleDateString()}`,
          openDate: isOpeningSoon ? item.salesStartAt : undefined,
          badges: item.metadata?.tags || [],
        };
      }) as SearchPerformance[];
    },
    enabled: !!query.trim(),
    staleTime: 30_000,
  });
};
