package com.ssafy.tickle.agency.event.presentation.dto;

import com.ssafy.tickle.event.domain.Event;
/**
 * 기획사 공연 생성 응답입니다.
 *
 * @param eventId 공연 식별자
 * @param title 공연명
 */
public record AgencyCreateEventResponse(
        Long eventId,
        String title
) {

    /**
     * 공연 엔티티를 응답 DTO로 변환합니다.
     *
     * @param event 공연 엔티티
     * @return 기획사 공연 생성 응답 DTO
     */
    public static AgencyCreateEventResponse from(Event event) {
        return new AgencyCreateEventResponse(
                event.getId(),
                event.getTitle()
        );
    }
}
