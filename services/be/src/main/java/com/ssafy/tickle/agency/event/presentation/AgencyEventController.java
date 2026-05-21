package com.ssafy.tickle.agency.event.presentation;

import com.ssafy.tickle.agency.event.application.AgencyEventBasicService;
import com.ssafy.tickle.agency.event.application.AgencyEventDeleteService;
import com.ssafy.tickle.agency.event.application.AgencyEventQueryService;
import com.ssafy.tickle.agency.event.application.AgencyEventSeatBatchService;
import com.ssafy.tickle.agency.event.application.AgencyEventSessionService;
import com.ssafy.tickle.agency.event.application.AgencyVenueTemplateService;
import com.ssafy.tickle.common.auth.UserId;
import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventBasicRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventPricePoliciesRequest;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyCreateEventResponse;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventDetailResponse;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventListResponse;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyEventSeatResponse;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSeatsRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSessionsRequest;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyVenueTemplateResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 기획사 공연 등록과 삭제 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/agency")
@RequiredArgsConstructor
public class AgencyEventController implements AgencyEventApiDoc {

    private final AgencyEventBasicService agencyEventBasicService;
    private final AgencyEventDeleteService agencyEventDeleteService;
    private final AgencyEventQueryService agencyEventQueryService;
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
     * 기획사 공연 목록을 조회합니다.
     *
     * @param userId JWT에서 추출한 사용자 식별자
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 공연 목록 응답
     */
    @Override
    @GetMapping("/events")
    public ResponseEntity<BaseResponse<AgencyEventListResponse>> getEvents(
            @UserId Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(BaseResponse.success(
                agencyEventQueryService.getEvents(userId, page, size)
        ));
    }

    /**
     * 기획사 공연 상세를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 상세 응답
     */
    @Override
    @GetMapping("/events/{eventId}")
    public ResponseEntity<BaseResponse<AgencyEventDetailResponse>> getEventDetail(
            @UserId Long userId,
            @PathVariable Long eventId
    ) {
        return ResponseEntity.ok(BaseResponse.success(agencyEventQueryService.getEventDetail(userId, eventId)));
    }

    /**
     * 기획사 공연 좌석 정보를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 좌석 응답
     */
    @Override
    @GetMapping("/events/{eventId}/seats")
    public ResponseEntity<BaseResponse<AgencyEventSeatResponse>> getEventSeats(
            @UserId Long userId,
            @PathVariable Long eventId
    ) {
        return ResponseEntity.ok(BaseResponse.success(agencyEventQueryService.getEventSeats(userId, eventId)));
    }

    /**
     * 기획사 공연 기본정보를 등록합니다.
     *
     * <p>multipart/form-data 형식. request는 JSON 파트, posterImage는 필수 이미지 파일,
     * detailImages는 소개 이미지 파일 목록(최대 3개, 선택).</p>
     *
     * @param request      공연 기본정보 JSON 파트
     * @param posterImage  포스터 이미지 파일 (필수)
     * @param detailImages 소개 이미지 파일 목록 (선택, 최대 3개)
     * @return 생성된 공연 응답
     */
    @Override
    @PostMapping(value = "/events", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BaseResponse<AgencyCreateEventResponse>> createEvent(
            @UserId Long userId,
            @Valid @RequestPart AgencyCreateEventBasicRequest request,
            @RequestPart MultipartFile posterImage,
            @RequestPart(required = false) List<MultipartFile> detailImages
    ) {
        AgencyCreateEventResponse response = agencyEventBasicService.createBasicEvent(
                userId, request, posterImage, detailImages
        );
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
            @UserId Long userId,
            @PathVariable Long eventId,
            @Valid @RequestBody AgencyCreateEventPricePoliciesRequest request
    ) {
        agencyEventBasicService.createPricePolicies(userId, eventId, request);
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
            @UserId Long userId,
            @PathVariable Long eventId,
            @Valid @RequestBody AgencyCreateEventSessionsRequest request
    ) {
        agencyEventSessionService.createSessions(userId, eventId, request);
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
            @UserId Long userId,
            @PathVariable Long eventId,
            @Valid @RequestBody AgencyCreateEventSeatsRequest request
    ) {
        agencyEventSeatBatchService.createSeats(userId, eventId, request.seats());
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
    public ResponseEntity<BaseResponse<Void>> deleteEvent(
            @UserId Long userId,
            @PathVariable Long eventId
    ) {
        agencyEventDeleteService.deleteEvent(userId, eventId);
        return ResponseEntity.ok(BaseResponse.success(SuccessCode.OK, null));
    }
}
