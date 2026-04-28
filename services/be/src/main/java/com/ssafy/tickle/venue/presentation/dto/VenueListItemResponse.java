package com.ssafy.tickle.venue.presentation.dto;

import com.ssafy.tickle.venue.domain.Venue;

/**
 * 공연장 목록 아이템 응답입니다.
 *
 * @param venueId 공연장 식별자
 * @param venueName 공연장명
 */
public record VenueListItemResponse(
        Long venueId,
        String venueName
) {

    /**
     * 공연장 엔티티를 목록 아이템 응답으로 변환합니다.
     *
     * @param venue 공연장 엔티티
     * @return 공연장 목록 아이템 응답
     */
    public static VenueListItemResponse from(Venue venue) {
        return new VenueListItemResponse(venue.getId(), venue.getVenueName());
    }
}
