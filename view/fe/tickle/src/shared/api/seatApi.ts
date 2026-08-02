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

  // 예매 대기 좌석 정보 조회
  fetchCancellationWaitSeats: async (
    eventId: string | number, 
    scheduleId: string | number,
    admitToken: string
  ): Promise<ApiResponse<SeatMapResponse>> => {
    return apiClient<ApiResponse<SeatMapResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/cancellation-wait/seats`, 
      { 
        method: 'GET',
        params: { admitToken }
      },
      false,
      createApiResponseSchema(SeatMapResponseSchema)
    );
  },

  // 좌석 선점 요청
  holdSeat: async (
    eventId: string | number,
    scheduleId: string | number,
    admitToken: string,
    request: SeatHoldRequest
  ): Promise<ApiResponse<SeatHoldResponse>> => {
    return apiClient<ApiResponse<SeatHoldResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold`, 
      {
        method: 'POST',
        params: { admitToken },
        body: request,
      },
      false,
      createApiResponseSchema(SeatHoldResponseSchema)
    );
  },

  // 좌석 선점 해제
  releaseSeat: async (
    eventId: string | number,
    scheduleId: string | number
  ): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold`,
      {
        method: 'DELETE',
        params: {},
      }
    );
  },

  /**
   * 페이지를 떠나면서 좌석 선점을 해제합니다.
   *
   * <p>브라우저는 탭이 닫히거나 다른 주소로 이동할 때 진행 중인 fetch를 취소합니다.
   * 일반 releaseSeat으로는 요청이 서버에 닿지 못해, 그 좌석이 선점 만료 시각까지
   * 아무도 살 수 없는 상태로 남습니다.</p>
   *
   * <p>{@code keepalive}를 켜면 문서가 사라진 뒤에도 브라우저가 요청을 끝까지
   * 보냅니다. sendBeacon은 POST만 가능하고 인증 헤더를 붙일 수 없어(이 API는
   * DELETE + Bearer) 쓸 수 없습니다.</p>
   *
   * <p>타임아웃도 끕니다. 응답을 받을 화면이 이미 없는데 15초 뒤 abort가 걸리면
   * 전송이 도중에 끊길 뿐입니다.</p>
   */
  releaseSeatOnExit: async (
    eventId: string | number,
    scheduleId: string | number
  ): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/seats/hold`,
      {
        method: 'DELETE',
        params: {},
        keepalive: true,
        timeoutMs: 0,
      }
    );
  },
};
