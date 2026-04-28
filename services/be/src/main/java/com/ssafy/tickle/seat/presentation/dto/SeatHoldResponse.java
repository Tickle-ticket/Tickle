package com.ssafy.tickle.seat.presentation.dto;

import java.time.Instant;
import java.util.List;

/**
 * 좌석 선점 응답 DTO입니다.
 *
 * @param heldSessionSeatIds 선점 완료된 sessionSeat ID 목록
 * @param expiresAt          선점 만료 시각 (UTC, 선점 후 15분)
 */
public record SeatHoldResponse(
        List<Long> heldSessionSeatIds,
        Instant expiresAt
) {
}
