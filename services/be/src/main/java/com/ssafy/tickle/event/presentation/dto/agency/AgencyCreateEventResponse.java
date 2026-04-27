package com.ssafy.tickle.event.presentation.dto.agency;

import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventSession;

import java.util.List;

/**
 * 기획사 공연 생성 응답입니다.
 *
 * @param eventId 공연 식별자
 * @param title 공연명
 * @param sessionIds 생성된 회차 식별자 목록
 * @param eventSeatCount 생성된 공연 좌석 수
 * @param sessionSeatCount 생성된 회차 좌석 수
 */
public record AgencyCreateEventResponse(
        Long eventId,
        String title,
        List<Long> sessionIds,
        int eventSeatCount,
        int sessionSeatCount
) {

    public static AgencyCreateEventResponse from(
            Event event,
            List<EventSession> sessions,
            int eventSeatCount,
            int sessionSeatCount
    ) {
        return new AgencyCreateEventResponse(
                event.getId(),
                event.getTitle(),
                sessions.stream().map(EventSession::getId).toList(),
                eventSeatCount,
                sessionSeatCount
        );
    }
}
