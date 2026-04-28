import { useQuery } from '@tanstack/react-query';
import { fetchEventList } from '@/src/shared/api/eventApi';

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
      const res = await fetchEventList({ keyword: query, size: 20, page: 0 });
      
      // Map EventItem to SearchPerformance for the UI
      return res.data.items.map((item) => ({
        id: String(item.eventId),
        title: item.title,
        imageUrl: item.thumbnailUrl,
        venue: item.venueLocation,
        date: `${new Date(item.eventStartAt).toLocaleDateString()} ~ ${new Date(item.eventEndAt).toLocaleDateString()}`,
        openDate: item.eventStartAt,
        badges: item.metadata?.tags || [],
      })) as SearchPerformance[];
    },
    enabled: !!query.trim(),
  });
};
