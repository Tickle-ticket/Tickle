import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import { ApiError, ApiResponse } from '@/src/shared/api/types';
import { isAlreadyCancelled } from '@/src/shared/api/errors';
import { PerformanceData } from '@/src/features/home/api/useHomeData';
import { getFavoriteEvents } from '@/src/shared/api/favoriteApi';
import { reservationApi } from '@/src/shared/api/reservationApi';
import { paymentApi } from '@/src/shared/api/paymentApi';
import { getCancellationWaitCandidates, cancelCancellationWaitCandidate, passCancellationOffer } from '@/src/shared/api/cancellationApi';
import type { CancellationWaitCandidateSummaryResponse } from '@/src/shared/api/types/cancellation.types';
import { getAccessToken } from '@/src/shared/api/tokenManager';
import { REALTIME, SHORT, LONG } from '@/src/shared/api/cachePolicy';

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
    // 찜 토글이 이 목록을 직접 갱신한다(useFavoriteToggle).
    staleTime: SHORT,
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
  cancellationOfferId?: number | null;
  status?: string;
}

/**
 * 좌석 하나를 공연 정보와 함께 펼친 형태.
 *
 * 대기 관리 화면은 공연별 그룹이 아니라 좌석 단위로 순번을 나열하므로,
 * 카드가 필요로 하는 공연 정보를 좌석에 붙여 평평하게 만든다.
 */
export interface FlatWaitlistSeat extends WaitlistSeatData {
  eventTitle: string;
  eventDate: string;
  eventImage: string;
  /** 취소 시 어느 공연의 좌석인지 되짚기 위한 원본 그룹. */
  parentItem: WaitlistBookingData;
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
        imageUrl: r.thumbnailImageUrl || '',
        title: r.eventTitle,
        venue: r.venueName,
        performanceDate: r.sessionStartAt,
        bookingDate: r.createdAt,
        seatInfo: `총 ${r.ticketCount}매`, // 명세에 좌석 배열이 없음
        ticketCount: r.ticketCount,
        status: r.bookingStatus,
        bookingNo: r.bookingNo,
        totalPaymentAmount: r.totalPaymentAmount,
        // paymentId는 목록 응답에 없다(ReservationSummaryResponse). 상세를 열 때
        // 받아 오므로 MyBookingsView가 bookingDetail에서 채운다.
      })) as BookingData[];
    },
    // 예매 취소가 이 목록을 invalidate한다(useCancelBooking).
    staleTime: SHORT,
  });
};

export const usePaymentStatus = (paymentId: number | null) => {
  return useQuery({
    queryKey: ['paymentStatus', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      const res = await paymentApi.getPaymentStatus(paymentId);
      return res.data;
    },
    enabled: !!paymentId,
    // PG 승인은 우리 앱 밖에서 확정되므로 언제 바뀌는지 알 수 없다. 매번 확인한다.
    staleTime: REALTIME,
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
    // 결제 진행 중에 상태(입금 대기 → 확정)가 서버에서 바뀔 수 있다.
    staleTime: REALTIME,
  });
};

export const usePastBookings = () => {
  return useQuery({
    queryKey: ['pastBookings'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<BookingData[]>>('/api/v1/mypage/bookings/past');
      return response.data;
    },
    // 이미 끝난 공연 목록이라 세션 중에 바뀌지 않는다.
    staleTime: LONG,
  });
};

export const useWaitlistBookings = () => {
  return useQuery({
    queryKey: ['waitlistBookings'],
    queryFn: async () => {
      const token = getAccessToken();
      if (!token) return [] as WaitlistBookingData[];
      
      let candidates: CancellationWaitCandidateSummaryResponse[];
      try {
        const response = await getCancellationWaitCandidates();
        candidates = response.data.candidates;
      } catch (err) {
        // 결제 완료 후 등 유효하지 않은 상태에서 에러가 발생하면 빈 배열 반환
        console.warn('취소표 대기 목록 조회 실패 (정상 케이스 가능):', err);
        return [] as WaitlistBookingData[];
      }
      
      // Group by scheduleId
      const grouped = candidates.reduce<Record<string, WaitlistBookingData>>((acc, curr) => {
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
          cancellationOfferId: curr.cancellationOfferId,
          status: curr.status,
        });
        
        return acc;
      }, {});

      const groupedArray = Object.values(grouped);

      groupedArray.forEach((group) => {
        group.seats.sort((a, b) => {
          const aOffered = a.status === 'OFFERED' ? 1 : 0;
          const bOffered = b.status === 'OFFERED' ? 1 : 0;
          if (aOffered !== bOffered) return bOffered - aOffered;
          return (a.waitlistNumber || 999) - (b.waitlistNumber || 999);
        });
      });

      // 그룹 자체도 가장 대기 순번이 빠른 것이 먼저 오도록 정렬
      groupedArray.sort((a, b) => {
        const aMin = a.seats[0]?.status === 'OFFERED' ? -1 : (a.seats[0]?.waitlistNumber || 999);
        const bMin = b.seats[0]?.status === 'OFFERED' ? -1 : (b.seats[0]?.waitlistNumber || 999);
        return aMin - bMin;
      });

      return groupedArray;
    },
    // 취소표 배정(OFFERED 전환)은 서버가 다른 사용자의 취소를 받아 일으키므로
    // 우리 쪽 mutation과 무관하게 바뀐다. 대기 순번도 같은 이유로 움직인다.
    staleTime: REALTIME,
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number | string }) => {
      try {
        const response = await reservationApi.cancelReservation(bookingId);
        return response.data;
      } catch (error) {
        // 이미 취소된 예매는 사용자가 원한 상태에 도달해 있다. 실패로 되던지면
        // 취소가 안 된 것처럼 보이므로 성공과 같게 흘려보낸다(onSuccess가 목록을
        // 갱신하면서 실제 상태가 화면에 반영된다).
        if (error instanceof ApiError && isAlreadyCancelled(error.code)) {
          return null;
        }
        throw error;
      }
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
      try {
        const response = await cancelCancellationWaitCandidate(candidateId);
        return response.data;
      } catch (error) {
        if (error instanceof ApiError && isAlreadyCancelled(error.code)) {
          return null;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlistBookings'] });
    },
  });
};

export const usePassCancellationOffer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cancellationId: string | number) => {
      const token = getAccessToken();
      if (!token) throw new Error('로그인이 필요합니다.');
      const response = await passCancellationOffer(cancellationId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlistBookings'] });
    },
  });
};
