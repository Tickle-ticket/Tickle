package com.ssafy.tickle.event.infrastructure.cache.model;

import com.ssafy.tickle.event.domain.EventSession;

import java.time.Instant;

/**
 * 공연 회차 목록 캐시 아이템입니다.
 *
 * @param sessionId 회차 식별자
 * @param sessionNo 회차 번호
 * @param startAt 시작 시각
 * @param endAt 종료 시각
 * @param salesOpenAt 판매 오픈 시각
 * @param salesCloseAt 판매 종료 시각
 * @param status 회차 상태
 */
public record CachedEventSessionItem(
        Long sessionId,
        Integer sessionNo,
        Instant startAt,
        Instant endAt,
        Instant salesOpenAt,
        Instant salesCloseAt,
        EventSession.Status status
) {

    public static CachedEventSessionItem from(EventSession session) {
        return new CachedEventSessionItem(
                session.getId(),
                session.getSessionNo(),
                session.getStartAt(),
                session.getEndAt(),
                session.getSalesOpenAt(),
                session.getSalesCloseAt(),
                session.getStatus()
        );
    }
}
