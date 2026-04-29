import { useQuery } from '@tanstack/react-query';
import { GradePrice } from '@/src/shared/components/PriceLegend';
import { fetchEventDetail, getEventPriceAmount } from '@/src/shared/api/eventApi';

export interface EventSchedule {
  date: string;
  times: {
    time: string;
    remainingSeats: { grade: string; count: number }[];
  }[];
}

type RemainingSeat = {
  grade: string;
  count: number;
};

type ScheduleTime = {
  time: string;
  remainingSeats: RemainingSeat[];
};

export interface EventDetailResponse {
  eventId: string;
  title: string;
  venue: string;
  date: string;
  zonePrices: GradePrice[];
  schedules: EventSchedule[];
  notice: string;
  openDate?: string;
}

export const useEventDetail = (eventId: string) => {
  return useQuery({
    queryKey: ['eventDetail', eventId],
    queryFn: async () => {
      const response = await fetchEventDetail(eventId);
      const data = response.data;

      const scheduleMap = new Map<string, ScheduleTime[]>();
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

      const startDate = new Date(data.eventStartAt).toLocaleDateString().replace(/\s/g, '');
      const endDate = new Date(data.eventEndAt).toLocaleDateString().replace(/\s/g, '');

      return {
        eventId: String(data.eventId),
        title: data.title,
        venue: data.venueName,
        date: `${startDate} ~ ${endDate}`,
        zonePrices: data.pricePolicies.map(p => ({
          grade: p.priceGrade,
          price: p.salePriceAmount,
          discountInfo: p.discountInfo
        })),
        schedules,
        notice: data.notice || '',
        openDate: data.salesStartAt,
      } as EventDetailResponse;
    },
    staleTime: 5 * 60 * 1000,
  });
};
