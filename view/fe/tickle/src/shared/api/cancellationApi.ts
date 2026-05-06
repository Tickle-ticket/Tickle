import { apiClient } from './client';
import type { ApiResponse } from './types';
import type { 
  CancellationOfferDetail, 
  CancellationPurchaseRequest, 
  CancellationPurchaseResponse,
  CancellationWaitCandidateCreateRequest,
  CancellationWaitCandidateCreateResponse,
  CancellationWaitCandidateListResponse
} from './types/cancellation.types';

/**
 * 취소표 상세 정보(좌석, 금액, 타이머) 조회
 * 
 * @param cancellationId 취소표 제안 ID
 * @returns 취소표 제안 상세 정보
 */
export const getCancellationDetail = async (cancellationId: number | string): Promise<ApiResponse<CancellationOfferDetail>> => {
  return apiClient<ApiResponse<CancellationOfferDetail>>(`/api/v1/cancellations/${cancellationId}`, {
    method: 'GET',
  });
};

/**
 * 취소표 구매 확정
 * 
 * @param cancellationId 취소표 제안 ID
 * @param request 구매 수단 정보
 * @returns 결제 응답 정보
 */
export const purchaseCancellation = async (
  cancellationId: number | string,
  request: CancellationPurchaseRequest
): Promise<ApiResponse<CancellationPurchaseResponse>> => {
  return apiClient<ApiResponse<CancellationPurchaseResponse>>(`/api/v1/cancellations/${cancellationId}/purchase`, {
    method: 'POST',
    body: request,
  });
};

/**
 * 예매 대기 신청
 * 
 * @param eventId 공연 식별자
 * @param scheduleId 회차 식별자
 * @param userId 사용자 식별자
 * @param admitToken 예매 대기 큐 입장 토큰
 * @param request 신청할 좌석 정보
 * @returns 생성된 예매 대기 신청 정보
 */
export const createCancellationWaitCandidates = async (
  eventId: number | string,
  scheduleId: number | string,
  userId: number | string,
  admitToken: string,
  request: CancellationWaitCandidateCreateRequest
): Promise<ApiResponse<CancellationWaitCandidateCreateResponse>> => {
  return apiClient<ApiResponse<CancellationWaitCandidateCreateResponse>>(
    `/api/v1/events/${eventId}/schedules/${scheduleId}/cancellation-wait/candidates`,
    {
      method: 'POST',
      params: { userId, admitToken },
      body: request,
    }
  );
};

/**
 * 예매 대기 신청 목록 조회
 * 
 * @param userId 사용자 식별자
 * @returns 예매 대기 신청 목록
 */
export const getCancellationWaitCandidates = async (
  userId: number | string
): Promise<ApiResponse<CancellationWaitCandidateListResponse>> => {
  return apiClient<ApiResponse<CancellationWaitCandidateListResponse>>(
    `/api/v1/cancellation-wait/candidates`,
    {
      method: 'GET',
      params: { userId },
    }
  );
};

/**
 * 예매 대기 신청 취소
 * 
 * @param candidateId 취소할 대기 신청 식별자
 * @param userId 사용자 식별자
 */
export const cancelCancellationWaitCandidate = async (
  candidateId: number | string,
  userId: number | string
): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(
    `/api/v1/cancellation-wait/candidates/${candidateId}`,
    {
      method: 'DELETE',
      params: { userId },
    }
  );
};
