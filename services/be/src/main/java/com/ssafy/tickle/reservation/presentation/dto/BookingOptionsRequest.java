package com.ssafy.tickle.reservation.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * 권종 선택 옵션 조회 요청 DTO입니다.
 *
 * @param eventId 공연 식별자
 * @param sessionId 회차 식별자
 * @param seatIds 선점한 회차 좌석 ID 목록
 */
public record BookingOptionsRequest(
        @NotNull(message = "eventId는 필수입니다.")
        Long eventId,
        @NotNull(message = "sessionId는 필수입니다.")
        Long sessionId,
        @NotEmpty(message = "seatIds는 최소 1개 이상이어야 합니다.")
        List<Long> seatIds
) {
}
