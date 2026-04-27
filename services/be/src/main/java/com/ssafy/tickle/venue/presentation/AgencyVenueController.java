package com.ssafy.tickle.venue.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.venue.application.AgencyVenueService;
import com.ssafy.tickle.venue.presentation.dto.AgencyVenueListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 기획사 공연장 목록 조회 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/agency/venues")
@RequiredArgsConstructor
public class AgencyVenueController implements AgencyVenueApiDoc {

    private final AgencyVenueService agencyVenueService;

    /**
     * 기획사 공연장 목록을 조회합니다.
     *
     * @return 공연장 목록 응답
     */
    @Override
    @GetMapping
    public ResponseEntity<BaseResponse<AgencyVenueListResponse>> getVenues() {
        return ResponseEntity.ok(BaseResponse.success(agencyVenueService.getVenues()));
    }
}
