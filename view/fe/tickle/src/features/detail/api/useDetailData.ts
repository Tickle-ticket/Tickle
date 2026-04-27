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
  viewingAge: string;
  runningTime: string;
  ticketNotice: string;
  zonePrices: { grade: string; price: number }[];
  schedules: { 
    date: string; 
    times: { time: string; remainingSeats: { grade: string; count: number }[]; }[] 
  }[];
  refundPolicy: string;
  detailImageUrl: string;
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

      // notice에서 관람등급/러닝타임/취소정책을 파싱 (BE에는 metadata에 tags만 존재)
      const noticeLines = (data.notice || '').split('\n');
      const findNotice = (prefix: string) => {
        const line = noticeLines.find(l => l.startsWith(prefix));
        return line ? line.replace(`${prefix}: `, '').replace(`${prefix}:`, '').trim() : '';
      };

      return {
        eventId: String(data.eventId),
        title: data.title,
        subTitle: data.categoryName || '',
        imageUrl: data.images.find(img => img.imageType === 'THUMBNAIL')?.imageUrl || '',
        openDate: data.salesStartAt,
        startDate: new Date(data.eventStartAt).toLocaleDateString().replace(/\s/g, ''),
        endDate: new Date(data.eventEndAt).toLocaleDateString().replace(/\s/g, ''),
        venue: data.venueName,
        venueAddress: data.venueAddress,
        viewingAge: findNotice('관람등급'),
        runningTime: findNotice('러닝타임'),
        ticketNotice: data.notice,
        zonePrices: data.pricePolicies.map(p => ({ grade: p.priceGrade, price: p.salePriceAmount })),
        schedules,
        refundPolicy: findNotice('취소정책'),
        detailImageUrl: data.images.find(img => img.imageType === 'DETAIL')?.imageUrl || ''
      } as DetailData;
    },
    staleTime: 5 * 60 * 1000,
  });
};
