package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.event.domain.EventSession;

import java.time.Instant;

/**
 * 이벤트 회차 응답 DTO입니다.
 *
 * @param sessionId 회차 식별자
 * @param sessionNo 회차 번호
 * @param startAt 시작 시각
 * @param endAt 종료 시각
 * @param salesOpenAt 판매 오픈 시각
 * @param salesCloseAt 판매 종료 시각
 * @param status 회차 상태
 */
public record EventSessionResponse(
        Long sessionId,
        Integer sessionNo,
        Instant startAt,
        Instant endAt,
        Instant salesOpenAt,
        Instant salesCloseAt,
        EventSession.Status status
) {

    /**
     * 이벤트 회차를 응답 DTO로 변환합니다.
     *
     * @param eventSession 이벤트 회차 엔티티
     * @return 이벤트 회차 응답
     */
    public static EventSessionResponse from(EventSession eventSession) {
        return new EventSessionResponse(
                eventSession.getId(),
                eventSession.getSessionNo(),
                eventSession.getStartAt(),
                eventSession.getEndAt(),
                eventSession.getSalesOpenAt(),
                eventSession.getSalesCloseAt(),
                eventSession.getStatus()
        );
    }
}
