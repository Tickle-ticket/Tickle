package com.ssafy.tickle.event.infrastructure.cache.model;

import java.util.List;

/**
 * 사용자별 정보가 제외된 오픈 임박 캐시 응답입니다.
 *
 * @param events 오픈 임박 공연 목록
 */
public record CachedOpeningSoonEventsResponse(
        List<CachedOpeningSoonEvent> events
) {
}
