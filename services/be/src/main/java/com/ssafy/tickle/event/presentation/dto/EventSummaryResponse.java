package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.event.domain.Event;

import java.time.Instant;

/**
 * 이벤트 목록 아이템 응답 DTO입니다.
 *
 * @param eventId 이벤트 식별자
 * @param title 이벤트 제목
 * @param venueLocation 공연장 위치
 * @param eventStartAt 공연 시작 시각
 * @param eventEndAt 공연 종료 시각
 * @param categoryName 카테고리명
 * @param thumbnailUrl 대표 이미지 URL
 * @param metadata 메타데이터 원문
 */
public record EventSummaryResponse(
        Long eventId,
        String title,
        String venueLocation,
        Instant eventStartAt,
        Instant eventEndAt,
        String categoryName,
        String thumbnailUrl,
        String metadata
) {

    /**
     * 이벤트 엔티티와 대표 이미지 URL을 목록 응답으로 변환합니다.
     *
     * @param event 이벤트 엔티티
     * @param thumbnailUrl 대표 이미지 URL
     * @return 이벤트 목록 아이템 응답
     */
    public static EventSummaryResponse from(Event event, String thumbnailUrl) {
        return new EventSummaryResponse(
                event.getId(),
                event.getTitle(),
                event.getVenue().getAddress(),
                event.getEventStartAt(),
                event.getEventEndAt(),
                event.getCategory().getCategoryName(),
                thumbnailUrl,
                event.getMetadata()
        );
    }
}
