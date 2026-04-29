import { apiClient } from './client';
import { ApiResponse } from './types';

// 백엔드 명세에 맞춘 타입 선언
export interface SeatItemResponse {
  sessionSeatId: number;
  eventSeatId: number;
  rowLabel: string;
  seatNumber: string;
  seatLabel: string;
  saleStatus: 'AVAILABLE' | 'HOLD' | 'RESERVED';
  price: number;
}

export interface SeatSectionResponse {
  sectionId: number;
  sectionName: string;
  displayOrder: number;
  seats: SeatItemResponse[];
}

export interface SeatMapResponse {
  sections: SeatSectionResponse[];
}

export interface SeatHoldRequest {
  sessionSeatIds: number[];
}

export interface SeatHoldResponse {
  heldSeats: SeatItemResponse[];
}

export const seatApi = {
  // 최초 좌석 정보 전체 조회
  fetchSeats: async (eventId: string | number, scheduleId: string | number): Promise<ApiResponse<SeatMapResponse>> => {
    return apiClient<ApiResponse<SeatMapResponse>>(`/api/v1/events/${eventId}/schedules/${scheduleId}/seats`, {
      method: 'GET',
    });
  },

  // 좌석 선점 요청
  holdSeat: async (
    eventId: string | number,
    scheduleId: string | number,
    userId: string | number,
    request: SeatHoldRequest
  ): Promise<ApiResponse<SeatHoldResponse>> => {
    return apiClient<ApiResponse<SeatHoldResponse>>(`/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold`, {
      method: 'POST',
      params: { userId },
      body: request,
    });
  },

  // 좌석 선점 해제
  releaseSeat: async (
    eventId: string | number,
    scheduleId: string | number,
    userId: string | number
  ): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>(`/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold`, {
      method: 'DELETE',
      params: { userId },
    });
  },
};
