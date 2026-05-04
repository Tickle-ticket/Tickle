import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';
import { PerformanceData } from '@/src/features/home/api/useHomeData';
import { getFavoriteEvents } from '@/src/shared/api/favoriteApi';
import { reservationApi } from '@/src/shared/api/reservationApi';
export const useMyUpcomingWishlist = () => {
  return useQuery({
    queryKey: ['myUpcomingWishlist'],
    queryFn: async () => {
      const response = await getFavoriteEvents(0, 100);
      const data = response.data;
      return data.items.map((item) => ({
        id: String(item.eventId),
        imageUrl: item.thumbnailUrl,
        title: item.title,
        venue: item.venueLocation,
        date: `${new Date(item.eventStartAt).toLocaleDateString().replace(/\s/g, '')} ~ ${new Date(item.eventEndAt).toLocaleDateString().replace(/\s/g, '')}`,
        badges: item.metadata?.tags || [],
        openDate: item.eventStartAt,
        isWishlisted: item.isFavorite
      })) as PerformanceData[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
export interface BookingData {
  id: string;
  eventId: string;
  imageUrl: string;
  title: string;
  venue: string;
  performanceDate: string; // 공연 일시
  bookingDate: string; // 예매 일시
  seatInfo: string; // 좌석 정보 등 기타 내용
  ticketCount: number;
}

export interface WaitlistSeatData {
  id: string;
  info: string;
  waitlistNumber: number;
}

export interface WaitlistBookingData {
  id: string;
  imageUrl: string;
  title: string;
  venue: string;
  performanceDate: string;
  waitDate: string;
  seats: WaitlistSeatData[];
}

export const useMyBookings = () => {
  return useQuery({
    queryKey: ['myBookings'],
    queryFn: async () => {
      const response = await reservationApi.fetchReservations();
      return response.data.items.map((r) => ({
        id: String(r.bookingId),
        eventId: String(r.eventId),
        imageUrl: r.thumbnailUrl,
        title: r.eventName,
        venue: r.venueName,
        performanceDate: r.eventStartAt,
        bookingDate: r.createdAt,
        seatInfo: r.seats.map((s) => s.seatLabel).join(', '),
        ticketCount: r.seats.length,
      })) as BookingData[];
    },
  });
};

export const usePastBookings = () => {
  return useQuery({
    queryKey: ['pastBookings'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<BookingData[]>>('/api/v1/mypage/bookings/past');
      return response.data.map((item) => ({
        ...item,
        imageUrl: normalizeImageUrl(item.imageUrl),
      }));
    },
  });
};

export const useWaitlistBookings = () => {
  return useQuery({
    queryKey: ['waitlistBookings'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<WaitlistBookingData[]>>('/api/v1/mypage/waitlist');
      return response.data.map((item) => ({
        ...item,
        imageUrl: normalizeImageUrl(item.imageUrl),
      }));
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await reservationApi.cancelReservation(bookingId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
  });
};
