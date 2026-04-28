package com.ssafy.tickle.seat.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 좌석 선점 요청 DTO입니다.
 *
 * @param sessionSeatIds 선점할 sessionSeat ID 목록 (최대 10개)
 */
public record SeatHoldRequest(
        @NotEmpty(message = "선점할 좌석을 최소 1개 이상 선택해주세요.")
        @Size(max = 10, message = "한 번에 최대 10개까지 선점 가능합니다.")
        List<Long> sessionSeatIds
) {
}
