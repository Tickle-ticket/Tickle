package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.infrastructure.cache.model.CachedEventRankingItem;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 이벤트 랭킹 응답 DTO입니다.
 *
 * @param rank 랭킹 순위
 * @param eventId 이벤트 식별자
 * @param eventName 공연명
 * @param venueName 공연장명
 * @param eventStartAt 공연 시작 시각
 * @param eventEndAt 공연 종료 시각
 * @param salesStartAt 예매 시작 시각
 * @param salesEndAt 예매 종료 시각
 * @param thumbnailUrl 썸네일 이미지 URL
 * @param tags 메타데이터 내 태그 목록
 * @param isFavorite 현재 사용자의 찜 여부
 */
public record EventRankingResponse(
        int rank,
        Long eventId,
        String eventName,
        String venueName,
        Instant eventStartAt,
        Instant eventEndAt,
        Instant salesStartAt,
        Instant salesEndAt,
        String thumbnailUrl,
        List<String> tags,
        boolean isFavorite
) {

    public static EventRankingResponse from(
            int rank,
            Event event,
            String thumbnailUrl,
            boolean isFavorite
    ) {
        return new EventRankingResponse(
                rank,
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
                        : new ArrayList<>(event.getMetadata().tags()),
                isFavorite
        );
    }

    public static EventRankingResponse from(CachedEventRankingItem item, boolean isFavorite) {
        return new EventRankingResponse(
                item.rank(),
                item.eventId(),
                item.eventName(),
                item.venueName(),
                item.eventStartAt(),
                item.eventEndAt(),
                item.salesStartAt(),
                item.salesEndAt(),
                item.thumbnailUrl(),
                item.tags(),
                isFavorite
        );
    }
}
