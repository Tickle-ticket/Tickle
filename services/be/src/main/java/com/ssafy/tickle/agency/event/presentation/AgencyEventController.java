package com.ssafy.tickle.agency.event.presentation;

import com.ssafy.tickle.agency.event.application.AgencyEventBasicService;
import com.ssafy.tickle.agency.event.application.AgencyEventDeleteService;
import com.ssafy.tickle.agency.event.application.AgencyEventSeatBatchService;
import com.ssafy.tickle.agency.event.application.AgencyEventSessionService;
import com.ssafy.tickle.agency.event.application.AgencyVenueTemplateService;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventBasicRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventPricePoliciesRequest;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyCreateEventResponse;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSeatsRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSessionsRequest;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyVenueTemplateResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 기획사 공연 등록과 삭제 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/agency")
@RequiredArgsConstructor
public class AgencyEventController implements AgencyEventApiDoc {

    private final AgencyEventBasicService agencyEventBasicService;
    private final AgencyEventDeleteService agencyEventDeleteService;
    private final AgencyEventSessionService agencyEventSessionService;
    private final AgencyEventSeatBatchService agencyEventSeatBatchService;
    private final AgencyVenueTemplateService agencyVenueTemplateService;

    /**
     * 공연 등록에 사용할 공연장 구역/좌석 템플릿을 조회합니다.
     *
     * @param venueId 공연장 식별자
     * @return 공연장 템플릿 응답
     */
    @Override
    @GetMapping("/venues/{venueId}/template")
    public ResponseEntity<BaseResponse<AgencyVenueTemplateResponse>> getVenueTemplate(@PathVariable Long venueId) {
        return ResponseEntity.ok(BaseResponse.success(agencyVenueTemplateService.getVenueTemplate(venueId)));
    }

    /**
     * 기획사 공연 기본정보를 등록합니다.
     *
     * @param request 기획사 공연 기본정보 등록 요청 DTO
     * @return 생성된 공연 응답
     */
    @Override
    @PostMapping("/events")
    public ResponseEntity<BaseResponse<AgencyCreateEventResponse>> createEvent(
            @Valid @RequestBody AgencyCreateEventBasicRequest request
    ) {
        AgencyCreateEventResponse response = agencyEventBasicService.createBasicEvent(request);
        return ResponseEntity
                .status(SuccessCode.CREATED.getStatus())
                .body(BaseResponse.success(SuccessCode.CREATED, response));
    }

    /**
     * 공연 가격 정책을 등록합니다.
     *
     * @param eventId 공연 식별자
     * @param request 공연 가격 정책 등록 요청 DTO
     * @return 성공 응답
     */
    @Override
    @PostMapping("/events/{eventId}/price-policies")
    public ResponseEntity<BaseResponse<Void>> createPricePolicies(
            @PathVariable Long eventId,
            @Valid @RequestBody AgencyCreateEventPricePoliciesRequest request
    ) {
        agencyEventBasicService.createPricePolicies(eventId, request);
        return ResponseEntity.ok(BaseResponse.success(SuccessCode.OK, null));
    }

    /**
     * 공연 회차를 등록합니다.
     *
     * @param eventId 공연 식별자
     * @param request 공연 회차 등록 요청 DTO
     * @return 성공 응답
     */
    @Override
    @PostMapping("/events/{eventId}/sessions")
    public ResponseEntity<BaseResponse<Void>> createSessions(
            @PathVariable Long eventId,
            @Valid @RequestBody AgencyCreateEventSessionsRequest request
    ) {
        agencyEventSessionService.createSessions(eventId, request);
        return ResponseEntity.ok(BaseResponse.success(SuccessCode.OK, null));
    }

    /**
     * 공연 좌석을 등록합니다.
     *
     * @param eventId 공연 식별자
     * @param request 공연 좌석 등록 요청 DTO
     * @return 성공 응답
     */
    @Override
    @PostMapping("/events/{eventId}/seats")
    public ResponseEntity<BaseResponse<Void>> createSeats(
            @PathVariable Long eventId,
            @Valid @RequestBody AgencyCreateEventSeatsRequest request
    ) {
        agencyEventSeatBatchService.createEventSeats(eventId, request.seats());
        return ResponseEntity.ok(BaseResponse.success(SuccessCode.OK, null));
    }

    /**
     * 예매 시작 전인 공연을 삭제합니다.
     *
     * @param eventId 공연 식별자
     * @return 성공 응답
     */
    @Override
    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<BaseResponse<Void>> deleteEvent(@PathVariable Long eventId) {
        agencyEventDeleteService.deleteEvent(eventId);
        return ResponseEntity.ok(BaseResponse.success(SuccessCode.OK, null));
    }
}
