package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.event.infrastructure.cache.model.CachedOpeningSoonEventsResponse;

import java.util.List;
import java.util.Set;

/**
 * 오픈 임박 공연 조회 래퍼 DTO입니다.
 *
 * @param events 오픈 임박 공연 목록
 */
public record OpeningSoonEventsResponse(
        List<OpeningSoonEventResponse> events
) {

    public static OpeningSoonEventsResponse from(List<OpeningSoonEventResponse> events) {
        return new OpeningSoonEventsResponse(events);
    }

    public static OpeningSoonEventsResponse from(
            CachedOpeningSoonEventsResponse cachedResponse,
            Set<Long> favoriteEventIds
    ) {
        // 캐시에는 없는 개인화 필드를 응답 직전에만 결합합니다.
        List<OpeningSoonEventResponse> events = cachedResponse.events().stream()
                .map(item -> OpeningSoonEventResponse.from(
                        item,
                        favoriteEventIds.contains(item.eventId())
                ))
                .toList();

        return new OpeningSoonEventsResponse(events);
    }
}
