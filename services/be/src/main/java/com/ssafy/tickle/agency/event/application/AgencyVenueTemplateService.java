package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyVenueTemplateResponse;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.domain.VenueSeat;
import com.ssafy.tickle.venue.domain.VenueSection;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSeatRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 기획사 공연 등록 화면에서 필요한 공연장 조회를 담당합니다.
 *
 * <p>공연장 골격만 조회하고 다른 등록 로직은 포함하지 않습니다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgencyVenueTemplateService {

    private final VenueRepository venueRepository;
    private final VenueSectionRepository venueSectionRepository;
    private final VenueSeatRepository venueSeatRepository;

    /**
     * 공연장 구역과 좌석 골격을 조회합니다.
     *
     * @param venueId 공연장 식별자
     * @return 공연 등록 화면에서 사용할 공연장 골격 응답 DTO
     */
    public AgencyVenueTemplateResponse getVenueTemplate(Long venueId) {
        Venue venue = getVenue(venueId);

        List<VenueSection> sections = venueSectionRepository.findByVenue_IdOrderByDisplayOrderAsc(venueId);

        List<VenueSeat> seats = venueSeatRepository.findByVenueIdOrderBySection_DisplayOrderAscRowLabelAscSeatNumberAsc(venueId);

        return AgencyVenueTemplateResponse.from(venue, sections, seats);
    }

    private Venue getVenue(Long venueId) {
        return venueRepository.findById(venueId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연장을 찾을 수 없습니다."));
    }
}
