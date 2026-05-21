package com.ssafy.tickle.agency.event.application.dto;

import com.ssafy.tickle.seat.domain.SessionSeat;

import java.time.Instant;

/**
 * 회차 좌석 batch insert에 필요한 값만 담는 명령입니다.
 *
 * @param sessionId 회차 식별자
 * @param eventSeatId 공연 좌석 식별자
 * @param eventSectionId 공연 구역 식별자
 * @param saleStatus 판매 상태
 * @param versionNo 버전 번호
 * @param updatedAt 수정 시각
 */
public record SessionSeatInsertCommand(
        Long sessionId,
        Long eventSeatId,
        Long eventSectionId,
        SessionSeat.SaleStatus saleStatus,
        Long versionNo,
        Instant updatedAt
) {

    /**
     * 생성된 공연 좌석으로부터 회차 좌석 생성 명령을 만듭니다.
     */
    public static SessionSeatInsertCommand of(Long sessionId, CreatedEventSeat eventSeat) {
        return new SessionSeatInsertCommand(
                sessionId,
                eventSeat.eventSeatId(),
                eventSeat.eventSectionId(),
                SessionSeat.SaleStatus.AVAILABLE,
                1L,
                Instant.now()
        );
    }
}
