package com.ssafy.tickle.venue.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.venue.application.VenueListService;
import com.ssafy.tickle.venue.presentation.dto.VenueListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 범용 공연장 조회 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/venues")
@RequiredArgsConstructor
public class VenueController implements VenueApiDoc {

    private final VenueListService venueListService;

    /**
     * 공연장 목록을 조회합니다.
     *
     * @return 공연장 목록 응답
     */
    @Override
    @GetMapping
    public ResponseEntity<BaseResponse<VenueListResponse>> getVenues() {
        return ResponseEntity.ok(BaseResponse.success(venueListService.getVenues()));
    }
}
