package com.ssafy.tickle.event.presentation.dto.agency;

import com.ssafy.tickle.venue.domain.VenueSeat;
import com.ssafy.tickle.venue.domain.VenueSection;

import java.util.List;

/**
 * 공연 등록용 공연장 구역 응답입니다.
 *
 * @param venueSectionId 공연장 구역 식별자
 * @param sectionName 구역명
 * @param displayOrder 정렬순서
 * @param seats 좌석 목록
 */
public record AgencyVenueTemplateSectionResponse(
        Long venueSectionId,
        String sectionName,
        Integer displayOrder,
        List<AgencyVenueTemplateSeatResponse> seats
) {

    public static AgencyVenueTemplateSectionResponse from(VenueSection section, List<VenueSeat> seats) {
        return new AgencyVenueTemplateSectionResponse(
                section.getId(),
                section.getSectionName(),
                section.getDisplayOrder(),
                seats.stream()
                        .map(AgencyVenueTemplateSeatResponse::from)
                        .toList()
        );
    }
}
