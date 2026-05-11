import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';
import { PerformanceData } from '@/src/features/home/api/useHomeData';
import { getFavoriteEvents } from '@/src/shared/api/favoriteApi';
import { reservationApi } from '@/src/shared/api/reservationApi';
import { getCancellationWaitCandidates, cancelCancellationWaitCandidate } from '@/src/shared/api/cancellationApi';
import { getAccessToken } from '@/src/shared/api/tokenManager';
export const useMyUpcomingWishlist = () => {
  return useQuery({
    queryKey: ['myUpcomingWishlist'],
    queryFn: async () => {
      const token = getAccessToken();

      if (!token) {
        return [] as PerformanceData[];
      }

      const response = await getFavoriteEvents(0, 100);
      const data = response.data;
      return data.items.map((item) => ({
        id: String(item.eventId),
        imageUrl: item.thumbnailUrl,
        title: item.title,
        venue: item.venueLocation,
        date: `${new Date(item.eventStartAt).toLocaleDateString().replace(/\s/g, '')} ~ ${new Date(item.eventEndAt).toLocaleDateString().replace(/\s/g, '')}`,
        badges: item.metadata?.tags ? [...item.metadata.tags] : [],
        openDate: item.salesStartAt || undefined,
        isWishlisted: item.isFavorite
      })) as PerformanceData[];
    },
    staleTime: 0,
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
  status: string;
  bookingNo: string;
  totalPaymentAmount: number;
  paymentId?: number;
}

export interface WaitlistSeatData {
  id: string;
  info: string;
  waitlistNumber: number;
}

export interface WaitlistBookingData {
  id: string;
  eventId: string;
  imageUrl: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  performanceDate: string;
  waitDate: string;
  initialSeats: string[];
  seats: WaitlistSeatData[];
}

export const useMyBookings = () => {
  return useQuery({
    queryKey: ['myBookings'],
    queryFn: async () => {
      const response = await reservationApi.fetchReservations();
      return response.data.items.map((r) => ({
        id: String(r.bookingId),
        eventId: '',
        imageUrl: '',
        title: r.eventTitle,
        venue: r.venueName,
        performanceDate: r.sessionStartAt,
        bookingDate: r.createdAt,
        seatInfo: `총 ${r.ticketCount}매`, // 명세에 좌석 배열이 없음
        ticketCount: r.ticketCount,
        status: r.bookingStatus,
        bookingNo: r.bookingNo,
        totalPaymentAmount: r.totalPaymentAmount,
        paymentId: (r as any).paymentId, // 백엔드에서 추가될 필드
      })) as BookingData[];
    },
    staleTime: 0,
  });
};

export const usePaymentStatus = (paymentId: number | null) => {
  return useQuery({
    queryKey: ['paymentStatus', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      // paymentApi import가 파일 상단에 없으므로, 여기서 동적으로 가져오거나 위에서 추가해야 합니다.
      // 파일 최상단에 import { paymentApi } from '@/src/shared/api/paymentApi'; 를 추가하겠습니다.
      const { paymentApi } = await import('@/src/shared/api/paymentApi');
      const res = await paymentApi.getPaymentStatus(paymentId);
      return res.data;
    },
    enabled: !!paymentId,
    staleTime: 0,
  });
};

export const useBookingDetail = (bookingId: string | null) => {
  return useQuery({
    queryKey: ['bookingDetail', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const response = await reservationApi.getReservationDetail(bookingId);
      return response.data;
    },
    enabled: !!bookingId,
    retry: false,
    staleTime: 0,
  });
};

export const usePastBookings = () => {
  return useQuery({
    queryKey: ['pastBookings'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<BookingData[]>>('/api/v1/mypage/bookings/past');
      return response.data;
    },
    staleTime: 0,
  });
};

export const useWaitlistBookings = () => {
  return useQuery({
    queryKey: ['waitlistBookings'],
    queryFn: async () => {
      const token = getAccessToken();
      if (!token) return [] as WaitlistBookingData[];
      
      const response = await getCancellationWaitCandidates();
      const candidates = response.data.candidates;
      
      // Group by scheduleId
      const grouped = candidates.reduce((acc: any, curr: any) => {
        if (!acc[curr.scheduleId]) {
          acc[curr.scheduleId] = {
            id: String(curr.scheduleId), // Use scheduleId as grouped waitlist ID
            eventId: String(curr.eventId),
            imageUrl: '', // Requires event detail fetch to show image, assuming mock for now
            title: curr.eventTitle,
            venue: '공연장 정보', // Venue is not in summary response
            performanceDate: curr.sessionStartAt,
            date: new Date(curr.sessionStartAt).toLocaleDateString().replace(/\s/g, ''),
            time: new Date(curr.sessionStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            waitDate: curr.createdAt,
            initialSeats: [],
            seats: [],
          };
        }
        
        const seatInfo = `${curr.sectionName} ${curr.rowLabel}열 ${curr.seatNumber}번`;
        acc[curr.scheduleId].initialSeats.push(curr.seatLabel);
        acc[curr.scheduleId].seats.push({
          id: String(curr.cancellationCandidateId),
          info: seatInfo,
          waitlistNumber: curr.currentRank,
        });
        
        return acc;
      }, {});

      return Object.values(grouped) as WaitlistBookingData[];
    },
    staleTime: 0,
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number | string }) => {
      const response = await reservationApi.cancelReservation(bookingId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
  });
};

export const useCancelWaitlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (candidateId: string) => {
      const token = getAccessToken();
      if (!token) throw new Error('로그인이 필요합니다.');
      const response = await cancelCancellationWaitCandidate(candidateId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlistBookings'] });
    },
  });
};
