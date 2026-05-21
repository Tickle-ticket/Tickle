package com.ssafy.tickle.agency.event.application.dto;

/**
 * 저장된 공연 좌석의 최소 식별 정보입니다.
 *
 * @param eventSeatId 공연 좌석 식별자
 * @param eventSectionId 공연 구역 식별자
 */
public record CreatedEventSeat(
        Long eventSeatId,
        Long eventSectionId
) {
}
