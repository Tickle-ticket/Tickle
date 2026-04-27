package com.ssafy.tickle.venue.presentation.dto;

import java.util.List;

/**
 * 기획사 공연장 목록 응답입니다.
 *
 * @param venues 공연장 목록
 */
public record AgencyVenueListResponse(
        List<AgencyVenueListItemResponse> venues
) {

    /**
     * 공연장 목록 아이템들을 목록 응답 DTO로 감쌉니다.
     *
     * @param venues 공연장 목록 아이템 DTO 목록
     * @return 기획사 공연장 목록 응답 DTO
     */
    public static AgencyVenueListResponse from(List<AgencyVenueListItemResponse> venues) {
        return new AgencyVenueListResponse(venues);
    }
}
