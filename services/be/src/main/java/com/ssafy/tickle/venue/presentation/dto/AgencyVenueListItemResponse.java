package com.ssafy.tickle.venue.presentation.dto;

import com.ssafy.tickle.venue.domain.Venue;

/**
 * 기획사 공연장 목록 아이템 응답입니다.
 *
 * @param venueId 공연장 식별자
 * @param venueName 공연장명
 * @param address 기본 주소
 * @param capacity 수용 인원
 */
public record AgencyVenueListItemResponse(
        Long venueId,
        String venueName,
        String address,
        Integer capacity
) {

    /**
     * 공연장 엔티티를 기획사 공연장 목록 아이템 DTO로 변환합니다.
     *
     * @param venue 공연장 엔티티
     * @return 기획사 공연장 목록 아이템 DTO
     */
    public static AgencyVenueListItemResponse from(Venue venue) {
        return new AgencyVenueListItemResponse(
                venue.getId(),
                venue.getVenueName(),
                venue.getAddress(),
                venue.getCapacity()
        );
    }
}
