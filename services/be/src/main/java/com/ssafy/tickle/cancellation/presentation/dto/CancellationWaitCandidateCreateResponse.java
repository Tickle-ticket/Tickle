package com.ssafy.tickle.cancellation.presentation.dto;

import java.util.List;

/**
 * 예매 대기 신청 응답 DTO입니다.
 *
 * @param seats 신청 완료된 좌석별 예매 대기 정보
 */
public record CancellationWaitCandidateCreateResponse(
        List<CancellationWaitCandidateSeatResponse> seats
) {
}
