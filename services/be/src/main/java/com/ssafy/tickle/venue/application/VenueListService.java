package com.ssafy.tickle.venue.application;

import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.venue.presentation.dto.VenueListItemResponse;
import com.ssafy.tickle.venue.presentation.dto.VenueListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 범용 공연장 목록 조회를 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VenueListService {

    private final VenueRepository venueRepository;

    /**
     * 공연장 목록을 조회합니다.
     *
     * @return 공연장 목록 응답 DTO
     */
    public VenueListResponse getVenues() {
        return VenueListResponse.from(
                venueRepository.findAllOrderByVenueName().stream()
                        .map(VenueListItemResponse::from)
                        .toList()
        );
    }
}
