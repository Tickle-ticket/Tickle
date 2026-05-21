package com.ssafy.tickle.event.infrastructure.cache.model;

import com.ssafy.tickle.event.domain.Event;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 사용자별 정보가 제외된 오픈 임박 캐시 아이템입니다.
 *
 * @param eventId 공연 식별자
 * @param eventName 공연명
 * @param venueName 공연장명
 * @param eventStartAt 공연 시작 시각
 * @param eventEndAt 공연 종료 시각
 * @param salesStartAt 예매 시작 시각
 * @param salesEndAt 예매 종료 시각
 * @param thumbnailUrl 썸네일 URL
 * @param tags 태그 목록
 */
public record CachedOpeningSoonEvent(
        Long eventId,
        String eventName,
        String venueName,
        Instant eventStartAt,
        Instant eventEndAt,
        Instant salesStartAt,
        Instant salesEndAt,
        String thumbnailUrl,
        List<String> tags
) {

    public static CachedOpeningSoonEvent from(Event event, String thumbnailUrl) {
        return new CachedOpeningSoonEvent(
                event.getId(),
                event.getTitle(),
                event.getVenue().getVenueName(),
                event.getEventStartAt(),
                event.getEventEndAt(),
                event.getSalesStartAt(),
                event.getSalesEndAt(),
                thumbnailUrl,
                event.getMetadata() == null
                        ? new ArrayList<>()
                        : new ArrayList<>(event.getMetadata().tags())
        );
    }
}
