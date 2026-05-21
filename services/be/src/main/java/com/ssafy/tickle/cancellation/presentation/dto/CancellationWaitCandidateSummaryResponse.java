package com.ssafy.tickle.cancellation.presentation.dto;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.seat.domain.EventSeat;
import com.ssafy.tickle.seat.domain.SessionSeat;

import java.time.Instant;

/**
 * 사용자의 예매 대기 신청 요약 응답입니다.
 *
 * @param cancellationCandidateId 예매 대기 신청 식별자
 * @param cancellationOfferId 취소표 제안 식별자
 * @param eventId 공연 식별자
 * @param eventTitle 공연명
 * @param scheduleId 회차 식별자
 * @param sessionNo 회차 번호
 * @param sessionStartAt 회차 시작 시각
 * @param sessionSeatId 회차 좌석 식별자
 * @param eventSeatId 공연 좌석 식별자
 * @param sectionName 좌석 구역명
 * @param rowLabel 좌석 열
 * @param seatNumber 좌석 번호
 * @param seatLabel 좌석 표시명
 * @param seatGrade 좌석 등급
 * @param saleStatus 현재 좌석 판매 상태
 * @param currentRank 현재 예매 대기 순위
 * @param status 예매 대기 신청 상태
 * @param createdAt 예매 대기 신청 시각
 */
public record CancellationWaitCandidateSummaryResponse(
        Long cancellationCandidateId,
        Long cancellationOfferId,
        Long eventId,
        String eventTitle,
        Long scheduleId,
        Integer sessionNo,
        Instant sessionStartAt,
        Long sessionSeatId,
        Long eventSeatId,
        String sectionName,
        String rowLabel,
        String seatNumber,
        String seatLabel,
        SeatGrade seatGrade,
        SessionSeat.SaleStatus saleStatus,
        int currentRank,
        CancellationCandidate.Status status,
        Instant createdAt
) {

    /**
     * 예매 대기 후보와 현재 순위를 응답 DTO로 변환합니다.
     *
     * @param candidate 예매 대기 후보
     * @param currentRank 현재 예매 대기 순위
     * @return 예매 대기 신청 요약 응답
     */
    public static CancellationWaitCandidateSummaryResponse of(
            CancellationCandidate candidate,
            int currentRank,
            Long cancellationOfferId
    ) {
        SessionSeat sessionSeat = candidate.getSessionSeat();
        EventSeat eventSeat = sessionSeat.getEventSeat();

        return new CancellationWaitCandidateSummaryResponse(
                candidate.getId(),
                cancellationOfferId,
                sessionSeat.getSession().getEvent().getId(),
                sessionSeat.getSession().getEvent().getTitle(),
                sessionSeat.getSession().getId(),
                sessionSeat.getSession().getSessionNo(),
                sessionSeat.getSession().getStartAt(),
                sessionSeat.getId(),
                eventSeat.getId(),
                eventSeat.getEventSection().getSectionName(),
                eventSeat.getRowLabel(),
                eventSeat.getSeatNumber(),
                eventSeat.getSeatLabel(),
                eventSeat.getSeatGrade(),
                sessionSeat.getSaleStatus(),
                currentRank,
                candidate.getStatus(),
                candidate.getCreatedAt()
        );
    }
}
