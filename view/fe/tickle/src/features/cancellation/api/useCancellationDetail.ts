import { useQuery } from '@tanstack/react-query';
import { getCancellationDetail } from '@/src/shared/api/cancellationApi';
import type { CancellationOfferDetail } from '@/src/shared/api/types/cancellation.types';

/**
 * 취소표 상세를 조회합니다.
 *
 * 취소표는 10분 타이머로 만료되므로 404가 정상 시나리오다. 그래서 전역 정책
 * (QueryProvider의 throwOnError — 403·404·5xx를 Error Boundary로 올림)을 기본으로
 * 쓰지 않는다. 만료된 오퍼를 열었을 뿐인데 마이페이지 전체가 에러 화면으로
 * 대체되기 때문이다. 두 호출부 모두 자체 에러 처리를 갖고 있다.
 *
 * @param cancellationId 취소표 오퍼 식별자
 * @param options.throwOnError 화면 대체가 필요하면 true로 켠다
 */
export const useCancellationDetail = (cancellationId: number | string | null, options?: { throwOnError?: boolean }) => {
  return useQuery<CancellationOfferDetail, Error>({
    queryKey: ['cancellationDetail', cancellationId],
    queryFn: async () => {
      if (!cancellationId) {
        throw new Error('취소표 ID가 없습니다.');
      }
      const response = await getCancellationDetail(cancellationId);
      // apiClient는 HTTP 200일 때 JSON body를 그대로 반환 (status: 200 or 0)
      if (response.status !== 200 && response.status !== 0) {
        throw new Error(response.message || '취소표 정보를 불러오는 데 실패했습니다.');
      }
      return response.data;
    },
    enabled: !!cancellationId,
    retry: false, // 403, 404 등에서 무한 재시도 방지
    staleTime: 0, // 항상 최신 정보(타이머 등)를 위해 캐시 무효화
    // undefined면 react-query가 "미지정"으로 보고 전역 정책을 적용한다. 만료된
    // 취소표(404)에 화면이 통째로 대체되므로 기본값을 false로 둔다.
    throwOnError: options?.throwOnError ?? false,
    // meta.silent는 QueryCache의 console 로그만 막는다. throwOnError와는 무관하다.
    meta: { silent: true },
  });
};
