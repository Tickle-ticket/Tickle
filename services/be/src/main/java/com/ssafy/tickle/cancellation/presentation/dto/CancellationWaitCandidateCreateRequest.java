package com.ssafy.tickle.cancellation.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 예매 대기 신청 요청 DTO입니다.
 *
 * @param sessionSeatIds 예매 대기 신청할 회차 좌석 식별자 목록
 */
public record CancellationWaitCandidateCreateRequest(
        @NotEmpty(message = "예매 대기 신청할 좌석을 최소 1개 이상 선택해주세요.")
        @Size(max = 4, message = "한 번에 최대 4개까지 예매 대기 신청할 수 있습니다.")
        List<Long> sessionSeatIds
) {
}
