package com.ssafy.tickle.cancellation.presentation.dto;

import java.util.List;

/**
 * 사용자의 예매 대기 신청 목록 응답입니다.
 *
 * @param candidates 예매 대기 신청 목록
 */
public record CancellationWaitCandidateListResponse(
        List<CancellationWaitCandidateSummaryResponse> candidates
) {
}
