package com.ssafy.tickle.cancellation.presentation.dto;

import com.ssafy.tickle.seat.domain.SessionSeat;

/**
 * 예매 대기 좌석 SSE payload입니다.
 *
 * @param sessionSeatId 회차 좌석 식별자
 * @param saleStatus 현재 판매 상태
 * @param waitingCount 해당 좌석의 활성 예매 대기 인원 수
 */
public record CancellationWaitSeatStatusMessage(
        Long sessionSeatId,
        SessionSeat.SaleStatus saleStatus,
        long waitingCount
) {
}
