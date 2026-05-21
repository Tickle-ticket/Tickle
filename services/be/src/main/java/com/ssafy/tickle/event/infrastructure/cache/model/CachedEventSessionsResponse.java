package com.ssafy.tickle.event.infrastructure.cache.model;

import com.ssafy.tickle.event.domain.EventSession;

import java.util.List;

/**
 * 공연 회차 목록 캐시 응답입니다.
 *
 * @param sessions 회차 목록
 */
public record CachedEventSessionsResponse(
        List<CachedEventSessionItem> sessions
) {

    public static CachedEventSessionsResponse from(List<EventSession> sessions) {
        return new CachedEventSessionsResponse(
                sessions.stream()
                        .map(CachedEventSessionItem::from)
                        .toList()
        );
    }
}
