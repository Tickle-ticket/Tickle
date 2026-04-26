import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';
import { PerformanceData } from '@/src/features/home/api/useHomeData';

export const useMyUpcomingWishlist = () => {
  return useQuery({
    queryKey: ['myUpcomingWishlist'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<PerformanceData[]>>('/api/v1/mypage/wishlist/upcoming');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export interface BookingData {
  id: string;
  imageUrl: string;
  title: string;
  venue: string;
  performanceDate: string; // 공연 일시
  bookingDate: string; // 예매 일시
  seatInfo: string; // 좌석 정보 등 기타 내용
  ticketCount: number;
}

export const useMyBookings = () => {
  return useQuery({
    queryKey: ['myBookings'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<BookingData[]>>('/api/v1/mypage/bookings');
      return response.data;
    },
  });
};

export const usePastBookings = () => {
  return useQuery({
    queryKey: ['pastBookings'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<BookingData[]>>('/api/v1/mypage/bookings/past');
      return response.data;
    },
  });
};

export const useWaitlistBookings = () => {
  return useQuery({
    queryKey: ['waitlistBookings'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<any[]>>('/api/v1/mypage/waitlist');
      return response.data;
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await http.delete<ApiResponse<null>>(`/api/v1/mypage/bookings/${bookingId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
  });
};
