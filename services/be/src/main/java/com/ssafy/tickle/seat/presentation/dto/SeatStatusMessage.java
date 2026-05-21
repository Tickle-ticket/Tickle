package com.ssafy.tickle.seat.presentation.dto;

import com.ssafy.tickle.seat.domain.SessionSeat;
import java.util.List;

/**
 * SSE로 Push하는 좌석 상태 변경 메시지입니다.
 *
 * <p>FE는 {@code /api/v1/events/{eventId}/schedules/{scheduleId}/seats/stream} 엔드포인트를 구독하여
 * 이 메시지를 수신하고, 로컬 좌석 배치도 상태를 실시간으로 업데이트합니다.</p>
 *
 * @param sessionSeatIds 상태가 변경된 sessionSeat 식별자 목록
 * @param saleStatus     변경된 좌석 상태
 */
public record SeatStatusMessage(
        List<Long> sessionSeatIds,
        SessionSeat.SaleStatus saleStatus
) {
}
