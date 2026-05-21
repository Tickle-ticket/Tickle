package com.ssafy.tickle.cancellation.presentation.dto;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;

/**
 * 예매 대기 신청된 좌석 응답 DTO입니다.
 *
 * @param cancellationCandidateId 예매 대기 후보 식별자
 * @param sessionSeatId 회차 좌석 식별자
 * @param waitingRank 좌석별 대기 순번
 * @param status 예매 대기 후보 상태
 */
public record CancellationWaitCandidateSeatResponse(
        Long cancellationCandidateId,
        Long sessionSeatId,
        Integer waitingRank,
        CancellationCandidate.Status status
) {

    /**
     * 예매 대기 후보 엔티티로 응답 DTO를 생성합니다.
     *
     * @param candidate 예매 대기 후보 엔티티
     * @return 예매 대기 신청 좌석 응답
     */
    public static CancellationWaitCandidateSeatResponse from(CancellationCandidate candidate) {
        return new CancellationWaitCandidateSeatResponse(
                candidate.getId(),
                candidate.getSessionSeat().getId(),
                candidate.getWaitingRank(),
                candidate.getStatus()
        );
    }
}
