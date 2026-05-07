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
} from './types/reservation.types';

export const reservationApi = {
  fetchReservations: async (userId: number): Promise<ApiResponse<ReservationListResponse>> => {
    return apiClient<ApiResponse<ReservationListResponse>>(
      '/api/v1/reservations',
      { 
        method: 'GET',
        params: { userId }
      },
      false,
      createApiResponseSchema(ReservationListResponseSchema)
    );
  },

  getReservationDetail: async (reservationId: string | number, userId: number): Promise<ApiResponse<ReservationDetail>> => {
    return apiClient<ApiResponse<ReservationDetail>>(
      `/api/v1/reservations/${reservationId}`,
      { 
        method: 'GET',
        params: { userId }
      },
      false,
      createApiResponseSchema(ReservationDetailSchema)
    );
  },

  cancelReservation: async (reservationId: string | number, userId: number): Promise<ApiResponse<null>> => {
    return apiClient<ApiResponse<null>>(
      `/api/v1/reservations/${reservationId}`,
      { 
        method: 'DELETE',
        params: { userId }
      }
    );
  },
};
