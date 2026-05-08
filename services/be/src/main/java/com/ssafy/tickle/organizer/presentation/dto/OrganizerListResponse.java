package com.ssafy.tickle.organizer.presentation.dto;

import java.util.List;

/**
 * 주최자 목록 응답입니다.
 *
 * @param organizers 주최자 목록
 */
public record OrganizerListResponse(
        List<OrganizerListItemResponse> organizers
) {

    /**
     * 주최자 목록 아이템들을 응답으로 감쌉니다.
     *
     * @param organizers 주최자 목록 아이템
     * @return 주최자 목록 응답
     */
    public static OrganizerListResponse from(List<OrganizerListItemResponse> organizers) {
        return new OrganizerListResponse(organizers);
    }
}
