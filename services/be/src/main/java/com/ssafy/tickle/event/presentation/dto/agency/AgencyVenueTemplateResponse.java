package com.ssafy.tickle.event.presentation.dto.agency;

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
