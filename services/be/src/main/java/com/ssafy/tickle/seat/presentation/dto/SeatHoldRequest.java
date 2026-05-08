package com.ssafy.tickle.seat.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 좌석 선점 요청 DTO입니다.
 *
 * <p>FE에서 좌석을 선택한 뒤 "선택완료" 클릭 시 선택한 좌석 목록을 한 번에 전송합니다.
 * 1인당 최대 4개까지 선점 가능합니다 (ADR 시나리오 10 — 악의적 반복 선점 방지).</p>
 *
 * @param sessionSeatIds 선점할 sessionSeat ID 목록 (최소 1개, 최대 4개)
 */
public record SeatHoldRequest(
        @NotEmpty(message = "선점할 좌석을 최소 1개 이상 선택해주세요.")
        @Size(max = 4, message = "한 번에 최대 4개까지 선점 가능합니다.")
        List<Long> sessionSeatIds
) {
}
