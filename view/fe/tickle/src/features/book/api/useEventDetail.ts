import { useQuery } from '@tanstack/react-query';
import { GradePrice } from '@/src/shared/components/PriceLegend';

export interface EventSchedule {
  date: string;
  times: {
    time: string;
    remainingSeats: { grade: string; count: number }[];
  }[];
}

export interface EventDetailResponse {
  eventId: string;
  title: string;
  venue: string;
  date: string;
  zonePrices: GradePrice[];
  schedules: EventSchedule[];
  refundPolicy: string;
}

export const useEventDetail = (eventId: string) => {
  return useQuery({
    queryKey: ['eventDetail', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch event details');
      }
      const data = await response.json();
      return data.data as EventDetailResponse;
    },
    staleTime: 5 * 60 * 1000,
  });
};
