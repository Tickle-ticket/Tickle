package com.ssafy.tickle.venue.presentation.dto;

import java.util.List;

/**
 * 공연장 목록 응답입니다.
 *
 * @param venues 공연장 목록
 */
public record VenueListResponse(
        List<VenueListItemResponse> venues
) {

    /**
     * 공연장 목록 아이템들을 응답으로 감쌉니다.
     *
     * @param venues 공연장 목록 아이템
     * @return 공연장 목록 응답
     */
    public static VenueListResponse from(List<VenueListItemResponse> venues) {
        return new VenueListResponse(venues);
    }
}
