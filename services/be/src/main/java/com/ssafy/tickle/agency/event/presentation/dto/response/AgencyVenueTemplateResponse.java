package com.ssafy.tickle.agency.event.presentation.dto.response;

import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.domain.VenueSeat;
import com.ssafy.tickle.venue.domain.VenueSection;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 공연 등록용 공연장 골격 응답입니다.
 *
 * @param venueId 공연장 식별자
 * @param venueName 공연장명
 * @param sections 공연장 구역/좌석 정보
 */
public record AgencyVenueTemplateResponse(
        Long venueId,
        String venueName,
        List<AgencyVenueTemplateSectionResponse> sections
) {

    /**
     * 공연장과 구역/좌석 목록을 공연장 템플릿 응답 DTO로 변환합니다.
     *
     * @param venue 공연장 엔티티
     * @param sections 공연장 구역 목록
     * @param seats 공연장 좌석 목록
     * @return 공연장 템플릿 응답 DTO
     */
    public static AgencyVenueTemplateResponse from(
            Venue venue,
            List<VenueSection> sections,
            List<VenueSeat> seats
    ) {
        Map<Long, List<VenueSeat>> seatsBySectionId = seats.stream()
                .collect(Collectors.groupingBy(seat -> seat.getSection().getId()));

        return new AgencyVenueTemplateResponse(
                venue.getId(),
                venue.getVenueName(),
                sections.stream()
                        .map(section -> AgencyVenueTemplateSectionResponse.from(
                                section,
                                seatsBySectionId.getOrDefault(section.getId(), List.of())
                        ))
                        .toList()
        );
    }
}
