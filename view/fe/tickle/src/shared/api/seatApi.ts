import { apiClient } from './client';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import {
  SeatMapResponse,
  SeatHoldRequest,
  SeatHoldResponse,
  SeatMapResponseSchema,
  SeatHoldResponseSchema,
} from './types/seat.types';

export const seatApi = {
  // 최초 좌석 정보 전체 조회
  fetchSeats: async (eventId: string | number, scheduleId: string | number): Promise<ApiResponse<SeatMapResponse>> => {
    return apiClient<ApiResponse<SeatMapResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/seats`, 
      { method: 'GET' },
      false,
      createApiResponseSchema(SeatMapResponseSchema)
    );
  },

  // 좌석 선점 요청
  holdSeat: async (
    eventId: string | number,
    scheduleId: string | number,
    userId: string | number,
    request: SeatHoldRequest
  ): Promise<ApiResponse<SeatHoldResponse>> => {
    return apiClient<ApiResponse<SeatHoldResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold`, 
      {
        method: 'POST',
        params: { userId },
        body: request,
      },
      false,
      createApiResponseSchema(SeatHoldResponseSchema)
    );
  },

  // 좌석 선점 해제
  releaseSeat: async (
    eventId: string | number,
    scheduleId: string | number,
    userId: string | number
  ): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold`, 
      {
        method: 'DELETE',
        params: { userId },
      }
    );
  },
};
