import { useQuery } from '@tanstack/react-query';
import { fetchEventList, fetchCategories } from '@/src/shared/api/eventApi';

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
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const params: any = { size: 20, page: 0 };
      if (query !== '전체') {
        try {
          const categoryRes = await fetchCategories();
          const matchedCategory = categoryRes.data?.categories?.find(c => c.categoryName === query);
          
          if (matchedCategory) {
            params.categoryId = matchedCategory.categoryId;
          } else {
            params.keyword = query;
          }
        } catch (error) {
          // 에러 발생 시 fallback으로 키워드 검색 사용
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
