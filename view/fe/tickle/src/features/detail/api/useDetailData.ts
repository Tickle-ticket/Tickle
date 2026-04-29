import { useQuery } from '@tanstack/react-query';
import { fetchEventDetail } from '@/src/shared/api/eventApi';

export interface DetailData {
  eventId: string;
  title: string;
  subTitle: string;
  imageUrl: string;
  openDate?: string | null;
  startDate: string;
  endDate: string;
  venue: string;
  venueAddress: string;
  notice: string;
  zonePrices: { grade: string; price: number }[];
  schedules: { 
    date: string; 
    times: { time: string; remainingSeats: { grade: string; count: number }[]; }[] 
  }[];
  detailImageUrl: string;
  isFavorite: boolean;
  tags: string[];
}

export const useDetailData = (eventId: string = '1') => {
  return useQuery({
    queryKey: ['detailData', eventId],
    queryFn: async () => {
      const response = await fetchEventDetail(eventId);
      const data = response.data;
      
      const scheduleMap = new Map<string, { time: string, remainingSeats: any[] }[]>();
      data.sessions.forEach(session => {
        const dateObj = new Date(session.startAt);
        const date = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
        const time = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        
        if (!scheduleMap.has(date)) {
          scheduleMap.set(date, []);
        }
        scheduleMap.get(date)!.push({
          time,
          remainingSeats: []
        });
      });

      const schedules = Array.from(scheduleMap.entries()).map(([date, times]) => ({
        date,
        times
      }));

      return {
        eventId: String(data.eventId),
        title: data.title,
        subTitle: data.categoryName || '',
        imageUrl: data.images.find(img => img.imageType === 'THUMBNAIL' || img.imageType === 'POSTER')?.imageUrl || '',
        openDate: data.salesStartAt,
        startDate: new Date(data.eventStartAt).toLocaleDateString().replace(/\s/g, ''),
        endDate: new Date(data.eventEndAt).toLocaleDateString().replace(/\s/g, ''),
        venue: data.venueName,
        venueAddress: data.venueAddress,
        notice: data.notice || '',
        zonePrices: data.pricePolicies.map((p: any) => ({ grade: p.priceGrade || p.grade || p.name || '일반', price: p.salePriceAmount || p.price || 0 })),
        schedules,
        detailImageUrl: data.images.find(img => img.imageType === 'DETAIL')?.imageUrl || '',
        isFavorite: data.isFavorite || false,
        tags: data.metadata?.tags || []
      } as DetailData;
    },
    staleTime: 5 * 60 * 1000,
  });
};
