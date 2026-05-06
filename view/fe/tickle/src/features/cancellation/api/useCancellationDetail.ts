import { useQuery } from '@tanstack/react-query';
import { getCancellationDetail } from '@/src/shared/api/cancellationApi';
import type { CancellationOfferDetail } from '@/src/shared/api/types/cancellation.types';

export const useCancellationDetail = (cancellationId: number | string | null) => {
  return useQuery<CancellationOfferDetail, Error>({
    queryKey: ['cancellationDetail', cancellationId],
    queryFn: async () => {
      if (!cancellationId) {
        throw new Error('취소표 ID가 없습니다.');
      }
      const response = await getCancellationDetail(cancellationId);
      // ApiResponse 형식에 맞춰 데이터 반환 (status가 0이면 성공)
      if (response.status !== 0) {
        throw new Error(response.message || '취소표 정보를 불러오는 데 실패했습니다.');
      }
      return response.data;
    },
    enabled: !!cancellationId,
    retry: false, // 403, 404 등에서 무한 재시도 방지
    staleTime: 0, // 항상 최신 정보(타이머 등)를 위해 캐시 무효화
  });
};
