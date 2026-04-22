import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/shared/api/client';

// 좌석 예약 가능 여부 (ID별 true/false 매핑)
export type SeatAvailabilityResponse = Record<string, boolean>;

export const useSeatData = () => {
  return useQuery<SeatAvailabilityResponse>({
    queryKey: ['seats'],
    queryFn: async () => {
      const response = await apiClient<{ status: number; message: string; data: SeatAvailabilityResponse }>('/api/seats');
      return response.data;
    },
    // 좌석 상태는 자주 바뀔 수 있으므로 백그라운드 갱신 주기를 짧게 설정할 수 있음
    staleTime: 1000 * 30, // 30초
  });
};
