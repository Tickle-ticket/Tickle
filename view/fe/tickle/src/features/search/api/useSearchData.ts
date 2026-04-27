import { useQuery } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';

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
      const res = await http.get<ApiResponse<SearchPerformance[]>>(`/api/v1/search?q=${encodeURIComponent(query)}`);
      return res.data;
    },
    enabled: !!query.trim(),
  });
};
