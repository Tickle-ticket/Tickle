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
