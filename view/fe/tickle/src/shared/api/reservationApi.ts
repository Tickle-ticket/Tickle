import { apiClient } from './client';
import { ApiResponse } from './types';
import { Schema } from 'effect';
import { createApiResponseSchema } from '../utils/schema';

export interface ReservationSeatInfo {
  sessionSeatId: number;
  seatLabel: string;
}

export interface ReservationItem {
  bookingId: number;
  bookingNo: string;
  eventId: number;
  eventName: string;
  venueName: string;
  eventStartAt: string;
  totalPaymentAmount: number;
  status: string;
  seats: ReservationSeatInfo[];
  createdAt: string;
  thumbnailUrl: string;
}

export interface ReservationListResponse {
  items: ReservationItem[];
  totalElements: number;
}

export const ReservationSeatInfoSchema = Schema.Struct({
  sessionSeatId: Schema.Number,
  seatLabel: Schema.String,
});

export const ReservationItemSchema = Schema.Struct({
  bookingId: Schema.Number,
  bookingNo: Schema.String,
  eventId: Schema.Number,
  eventName: Schema.String,
  venueName: Schema.String,
  eventStartAt: Schema.String,
  totalPaymentAmount: Schema.Number,
  status: Schema.String,
  seats: Schema.Array(ReservationSeatInfoSchema),
  createdAt: Schema.String,
  thumbnailUrl: Schema.String,
});

export const ReservationListResponseSchema = Schema.Struct({
  items: Schema.Array(ReservationItemSchema),
  totalElements: Schema.Number,
});

export const reservationApi = {
  fetchReservations: async (): Promise<ApiResponse<ReservationListResponse>> => {
    return apiClient<ApiResponse<ReservationListResponse>>(
      '/api/v1/reservations',
      { method: 'GET' },
      false,
      createApiResponseSchema(ReservationListResponseSchema)
    );
  },

  getReservationDetail: async (reservationId: string | number): Promise<ApiResponse<ReservationItem>> => {
    return apiClient<ApiResponse<ReservationItem>>(
      `/api/v1/reservations/${reservationId}`,
      { method: 'GET' },
      false,
      createApiResponseSchema(ReservationItemSchema)
    );
  },

  cancelReservation: async (reservationId: string | number): Promise<ApiResponse<null>> => {
    return apiClient<ApiResponse<null>>(
      `/api/v1/reservations/${reservationId}`,
      { method: 'DELETE' }
    );
  },
};
