package com.ssafy.tickle.seat.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 좌석 선점 요청 DTO입니다.
 *
 * <p>1인당 최대 4개까지 선점 가능합니다.
 * 이는 악의적 반복 선점으로 전체 좌석을 오염시키는 행위를 방지하기 위한 설계 결정입니다 (ADR 시나리오 10).</p>
 *
 * @param sessionSeatIds 선점할 sessionSeat ID 목록 (최소 1개, 최대 4개)
 */
public record SeatHoldRequest(
        @NotEmpty(message = "선점할 좌석을 최소 1개 이상 선택해주세요.")
        @Size(max = 4, message = "한 번에 최대 4개까지 선점 가능합니다.")
        List<Long> sessionSeatIds
) {
}
