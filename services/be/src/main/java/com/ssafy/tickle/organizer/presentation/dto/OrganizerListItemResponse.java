package com.ssafy.tickle.organizer.presentation.dto;

import com.ssafy.tickle.event.domain.Organizer;

/**
 * 주최자 목록 아이템 응답입니다.
 *
 * @param organizerId 주최자 식별자
 * @param organizerName 주최자명
 */
public record OrganizerListItemResponse(
        Long organizerId,
        String organizerName
) {

    /**
     * 주최자 엔티티를 목록 아이템 응답으로 변환합니다.
     *
     * @param organizer 주최자 엔티티
     * @return 주최자 목록 아이템 응답
     */
    public static OrganizerListItemResponse from(Organizer organizer) {
        return new OrganizerListItemResponse(organizer.getId(), organizer.getOrganizerName());
    }
}
