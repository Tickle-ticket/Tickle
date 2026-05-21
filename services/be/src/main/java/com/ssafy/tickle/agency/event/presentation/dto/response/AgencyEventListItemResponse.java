package com.ssafy.tickle.agency.event.presentation.dto.response;

import com.ssafy.tickle.event.domain.Event;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 기획사 공연 목록 아이템 응답입니다.
 *
 * @param eventId 공연 식별자
 * @param eventName 공연명
 * @param venueName 공연장명
 * @param eventStartAt 공연 시작 시각
 * @param eventEndAt 공연 종료 시각
 * @param salesStartAt 예매 시작 시각
 * @param reservationRate 예매율 퍼센트 값
 */
public record AgencyEventListItemResponse(
        Long eventId,
        String eventName,
        String venueName,
        Instant eventStartAt,
        Instant eventEndAt,
        Instant salesStartAt,
        BigDecimal reservationRate
) {

    /**
     * 공연 엔티티를 목록 아이템 응답으로 변환합니다.
     *
     * @param event 공연 엔티티
     * @param reservationRate 예매율 퍼센트 값
     * @return 공연 목록 아이템 응답
     */
    public static AgencyEventListItemResponse from(Event event, BigDecimal reservationRate) {
        return new AgencyEventListItemResponse(
                event.getId(),
                event.getTitle(),
                event.getVenue().getVenueName(),
                event.getEventStartAt(),
                event.getEventEndAt(),
                event.getSalesStartAt(),
                reservationRate
        );
    }
}
