package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;

import java.time.Instant;
import java.util.List;

/**
 * 이벤트 상세 응답 DTO입니다.
 *
 * @param eventId 이벤트 식별자
 * @param title 이벤트 제목
 * @param categoryName 카테고리명
 * @param organizerName 주최자명
 * @param venueName 공연장명
 * @param venueAddress 공연장 주소
 * @param cityName 도시명
 * @param timezoneCode 타임존 코드
 * @param salesStartAt 판매 시작 시각
 * @param salesEndAt 판매 종료 시각
 * @param eventStartAt 이벤트 시작 시각
 * @param eventEndAt 이벤트 종료 시각
 * @param metadata 메타데이터
 * @param notice 공지사항
 * @param status 이벤트 상태
 * @param images 이미지 목록
 * @param sessions 회차 목록
 * @param pricePolicies 가격 정책 목록
 */
public record EventDetailResponse(
        Long eventId,
        String title,
        String categoryName,
        String organizerName,
        String venueName,
        String venueAddress,
        String cityName,
        String timezoneCode,
        Instant salesStartAt,
        Instant salesEndAt,
        Instant eventStartAt,
        Instant eventEndAt,
        Event.EventMetadata metadata,
        String notice,
        Event.Status status,
        List<EventImageResponse> images,
        List<EventSessionResponse> sessions,
        List<EventPricePolicyResponse> pricePolicies
) {

    /**
     * 이벤트와 하위 정보를 이벤트 상세 응답 DTO로 변환합니다.
     *
     * @param event 이벤트 엔티티
     * @param images 이벤트 이미지 엔티티 목록
     * @param sessions 이벤트 회차 엔티티 목록
     * @param pricePolicies 이벤트 가격 정책 엔티티 목록
     * @return 이벤트 상세 응답
     */
    public static EventDetailResponse from(
            Event event,
            List<EventImage> images,
            List<EventSession> sessions,
            List<EventPricePolicy> pricePolicies
    ) {
        return new EventDetailResponse(
                event.getId(),
                event.getTitle(),
                event.getCategory().getCategoryName(),
                event.getOrganizer().getOrganizerName(),
                event.getVenue().getVenueName(),
                event.getVenue().getAddress(),
                event.getVenue().getCityName(),
                event.getVenue().getTimezoneCode(),
                event.getSalesStartAt(),
                event.getSalesEndAt(),
                event.getEventStartAt(),
                event.getEventEndAt(),
                metadataOrEmpty(event),
                event.getNotice(),
                event.getStatus(),
                images.stream()
                        .map(EventImageResponse::from)
                        .toList(),
                sessions.stream()
                        .map(EventSessionResponse::from)
                        .toList(),
                pricePolicies.stream()
                        .map(EventPricePolicyResponse::from)
                        .toList()
        );
    }

    private static Event.EventMetadata metadataOrEmpty(Event event) {
        return event.getMetadata() == null
                ? new Event.EventMetadata(java.util.List.of())
                : event.getMetadata();
    }
}
