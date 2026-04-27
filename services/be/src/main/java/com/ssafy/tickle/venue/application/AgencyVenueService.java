package com.ssafy.tickle.venue.application;

import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.venue.presentation.dto.AgencyVenueListItemResponse;
import com.ssafy.tickle.venue.presentation.dto.AgencyVenueListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 기획사 공연장 조회 비즈니스 로직을 처리합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgencyVenueService {

    private final VenueRepository venueRepository;

    /**
     * 기획사 공연 등록에 사용할 공연장 목록을 조회합니다.
     *
     * @return 공연장 목록 응답 DTO
     */
    public AgencyVenueListResponse getVenues() {
        return AgencyVenueListResponse.from(
                venueRepository.findAll().stream()
                        .sorted(java.util.Comparator.comparing(venue -> venue.getVenueName().toLowerCase()))
                        .map(AgencyVenueListItemResponse::from)
                        .toList()
        );
    }
}
