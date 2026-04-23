import { useQuery } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';

export interface DetailData {
  eventId: string;
  title: string;
  subTitle: string;
  imageUrl: string;
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
      const response = await http.get<ApiResponse<DetailData>>(`/api/v1/events/${eventId}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
  });
};
