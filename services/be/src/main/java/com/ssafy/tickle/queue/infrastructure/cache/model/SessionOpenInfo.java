package com.ssafy.tickle.queue.infrastructure.cache.model;

import com.ssafy.tickle.event.domain.EventSession;

import java.time.Instant;

/**
 * 대기열 진입 검증에 사용하는 회차 메타데이터입니다.
 *
 * @param sessionId 회차 식별자
 * @param salesOpenAt 예매 오픈 시각
 * @param salesCloseAt 예매 종료 시각
 */
public record SessionOpenInfo(
        Long sessionId,
        Instant salesOpenAt,
        Instant salesCloseAt
) {

    /**
     * 회차 엔티티를 대기열 메타데이터로 변환합니다.
     *
     * @param session 회차 엔티티
     * @return 대기열 메타데이터
     */
    public static SessionOpenInfo from(EventSession session) {
        return new SessionOpenInfo(
                session.getId(),
                session.getSalesOpenAt(),
                session.getSalesCloseAt()
        );
    }
}
