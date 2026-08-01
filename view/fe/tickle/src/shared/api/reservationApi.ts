import { apiClient } from './client';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import {
  ReservationItem,
  ReservationListResponse,
  ReservationItemSchema,
  ReservationListResponseSchema,
  ReservationDetail,
  ReservationDetailSchema,
  OwnershipCountResponse,
  OwnershipCountResponseSchema,
} from './types/reservation.types';

export const reservationApi = {
  fetchReservations: async (): Promise<ApiResponse<ReservationListResponse>> => {
    return apiClient<ApiResponse<ReservationListResponse>>(
      '/api/v1/reservations',
      { 
        method: 'GET',
        params: {}
      },
      false,
      createApiResponseSchema(ReservationListResponseSchema)
    );
  },

  getReservationDetail: async (reservationId: string | number): Promise<ApiResponse<ReservationDetail>> => {
    return apiClient<ApiResponse<ReservationDetail>>(
      `/api/v1/reservations/${reservationId}`,
      { 
        method: 'GET',
        params: {}
      },
      false,
      createApiResponseSchema(ReservationDetailSchema)
    );
  },

  cancelReservation: async (reservationId: string | number): Promise<ApiResponse<null>> => {
    return apiClient<ApiResponse<null>>(
      `/api/v1/reservations/${reservationId}`,
      {
        method: 'DELETE',
        params: {}
      }
    );
  },

  /**
   * 페이지를 떠나면서 예매 초안을 취소합니다.
   *
   * <p>초안이 남으면 거기 묶인 좌석도 함께 잠긴 채로 남습니다. 탭을 닫는 순간에는
   * 일반 fetch가 취소되므로 {@code keepalive}로 전송을 보장합니다
   * (seatApi.releaseSeatOnExit과 같은 이유).</p>
   */
  cancelReservationOnExit: async (reservationId: string | number): Promise<ApiResponse<null>> => {
    return apiClient<ApiResponse<null>>(
      `/api/v1/reservations/${reservationId}`,
      {
        method: 'DELETE',
        params: {},
        keepalive: true,
        timeoutMs: 0,
      }
    );
  },

  getOwnershipCount: async (eventId: number | string, scheduleId: number | string, userId: number | string): Promise<ApiResponse<OwnershipCountResponse>> => {
    return apiClient<ApiResponse<OwnershipCountResponse>>(
      '/api/v1/reservations/ownership-count',
      {
        method: 'GET',
        params: { eventId, scheduleId, userId }
      },
      true,
      createApiResponseSchema(OwnershipCountResponseSchema)
    );
  },
};
