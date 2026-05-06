package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.event.domain.EventSession;

import java.util.List;

/**
 * 공연 회차 목록 응답 DTO입니다.
 *
 * @param sessions 회차 목록
 */
public record EventSessionsResponse(
        List<EventSessionResponse> sessions
) {

    /**
     * 이벤트 회차 목록을 응답 DTO로 변환합니다.
     *
     * @param sessions 이벤트 회차 엔티티 목록
     * @return 공연 회차 목록 응답
     */
    public static EventSessionsResponse from(List<EventSession> sessions) {
        return new EventSessionsResponse(
                sessions.stream()
                        .map(EventSessionResponse::from)
                        .toList()
        );
    }
}
