package com.ssafy.tickle.event.presentation;

import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.event.application.AgencyEventService;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyCreateEventRequest;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyCreateEventResponse;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyVenueTemplateResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 기획사 공연 등록 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/agency")
@RequiredArgsConstructor
public class AgencyEventController implements AgencyEventApiDoc {

    private final AgencyEventService agencyEventService;

    @Override
    @GetMapping("/venues/{venueId}/template")
    public ResponseEntity<BaseResponse<AgencyVenueTemplateResponse>> getVenueTemplate(@PathVariable Long venueId) {
        return ResponseEntity.ok(BaseResponse.success(agencyEventService.getVenueTemplate(venueId)));
    }

    @Override
    @PostMapping("/events")
    public ResponseEntity<BaseResponse<AgencyCreateEventResponse>> createEvent(
            @Valid @RequestBody AgencyCreateEventRequest request
    ) {
        AgencyCreateEventResponse response = agencyEventService.createEvent(request);
        return ResponseEntity
                .status(SuccessCode.CREATED.getStatus())
                .body(BaseResponse.success(SuccessCode.CREATED, response));
    }
}
