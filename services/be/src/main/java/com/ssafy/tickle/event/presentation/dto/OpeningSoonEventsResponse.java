package com.ssafy.tickle.event.presentation.dto;

import java.util.List;

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
}
