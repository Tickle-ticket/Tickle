import { useQuery } from '@tanstack/react-query';
import { GradePrice } from '@/src/shared/components/PriceLegend';
import { fetchEventDetail, getEventPriceAmount } from '@/src/shared/api/eventApi';

export interface EventSchedule {
  date: string;
  times: {
    scheduleId: string;
    sessionNo: number;
    time: string;
    startAt: string;
    remainingSeats: { priceGrade: string; count: number }[];
  }[];
}

type RemainingSeat = {
  priceGrade: string;
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
  waitlistOpenDate?: string;
}

export const useEventDetail = (eventId?: string) => {
  return useQuery({
    queryKey: ['eventDetail', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('No event ID');
      const response = await fetchEventDetail(eventId);
      const data = response.data;

      const scheduleMap = new Map<string, { scheduleId: string, sessionNo: number, time: string, startAt: string, remainingSeats: any[] }[]>();
      data.sessions.forEach(session => {
        const dateObj = new Date(session.startAt);
        const date = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
        const time = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

        if (!scheduleMap.has(date)) {
          scheduleMap.set(date, []);
        }
        scheduleMap.get(date)!.push({
          scheduleId: String(session.sessionId),
          sessionNo: session.sessionNo,
          time,
          startAt: session.startAt,
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
          priceGrade: p.priceGrade,
          price: getEventPriceAmount(p),
          discountInfo: p.discountInfo
        })),
        schedules,
        notice: data.notice || '',
        openDate: data.salesStartAt,
        waitlistOpenDate: data.sessions[0]?.cancellationWaitOpenAt,
      } as EventDetailResponse;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
};
