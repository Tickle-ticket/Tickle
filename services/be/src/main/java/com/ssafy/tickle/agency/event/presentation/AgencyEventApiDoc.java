package com.ssafy.tickle.agency.event.presentation;

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
import com.ssafy.tickle.common.auth.UserId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 기획사 공연 관리 API 문서 인터페이스입니다.
 *
 * 공연 기본정보, 가격 정책, 회차, 좌석, 공연장 템플릿 조회, 공연 삭제를 분리해서 문서화합니다.
 */
@Tag(name = "Agency Event Management", description = "기획사 공연 기본정보/가격 정책/회차/좌석 등록 API")
public interface AgencyEventApiDoc {

    /**
     * 기획사 공연 목록 조회 API를 문서화합니다.
     *
     * @param userId JWT에서 추출한 사용자 식별자
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 공연 목록 응답
     */
    @Operation(
            summary = "기획사 공연 목록 조회",
            description = "기획사가 등록한 공연 목록을 조회합니다. 예매율은 CONFIRMED 좌석 수를 공연장 capacity로 나눈 값입니다."
    )
    @ApiResponse(responseCode = "200", description = "공연 목록 조회 성공")
    @ApiResponse(
            responseCode = "404",
            description = "기획사를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<AgencyEventListResponse>> getEvents(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1001")
            @UserId
            Long userId,
            @Parameter(description = "페이지 번호", required = true, example = "0")
            int page,
            @Parameter(description = "페이지 크기", required = true, example = "20")
            int size
    );

    /**
     * 기획사 공연 상세 조회 API를 문서화합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 상세 응답
     */
    @Operation(
            summary = "기획사 공연 상세 조회",
            description = "기획사가 등록한 공연의 기본정보, 가격 정책, 회차 정보를 함께 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "공연 상세 조회 성공")
    @ApiResponse(
            responseCode = "404",
            description = "공연을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<AgencyEventDetailResponse>> getEventDetail(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1001")
            @UserId
            Long userId,
            @Parameter(description = "공연 식별자", required = true, example = "3011")
            Long eventId
    );

    /**
     * 기획사 공연 좌석 조회 API를 문서화합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 좌석 응답
     */
    @Operation(
            summary = "기획사 공연 좌석 조회",
            description = "기획사가 등록한 공연의 구역별 좌석 정보와 연결된 가격 정책 정보를 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "공연 좌석 조회 성공")
    @ApiResponse(
            responseCode = "404",
            description = "공연을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<AgencyEventSeatResponse>> getEventSeats(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1001")
            @UserId
            Long userId,
            @Parameter(description = "공연 식별자", required = true, example = "3011")
            Long eventId
    );

    /**
     * 공연장 템플릿 조회 API를 문서화합니다.
     *
     * @param venueId 공연장 식별자
     * @return 공연장 템플릿 응답
     */
    @Operation(
            summary = "공연장 이벤트 등록 골격 조회",
            description = "이미 등록된 공연장의 구역/좌석 골격을 조회하여 공연 등록 화면의 기본 템플릿으로 사용합니다."
    )
    @ApiResponse(responseCode = "200", description = "공연장 골격 조회 성공")
    @ApiResponse(
            responseCode = "404",
            description = "공연장을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<AgencyVenueTemplateResponse>> getVenueTemplate(
            @Parameter(description = "공연장 식별자", required = true, example = "2001")
            Long venueId
    );

    /**
     * 공연 기본정보 등록 API를 문서화합니다.
     *
     * <p>multipart/form-data 형식. request 파트는 JSON, posterImage는 포스터 이미지 파일(필수),
     * detailImages는 소개 이미지 파일 목록(선택, 최대 3개).</p>
     */
    @Operation(
            summary = "공연 기본정보 등록",
            description = "multipart/form-data 형식. request(JSON) + posterImage(파일, 필수) + detailImages(파일 목록, 최대 3개, 선택)."
    )
    @ApiResponse(responseCode = "201", description = "공연 등록 성공")
    @ApiResponse(responseCode = "400", description = "잘못된 요청값",
            content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    @ApiResponse(responseCode = "404", description = "기획사/공연장/카테고리를 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class)))
    ResponseEntity<BaseResponse<AgencyCreateEventResponse>> createEvent(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1001")
            @UserId
            Long userId,
            AgencyCreateEventBasicRequest request,
            @Parameter(description = "포스터 이미지 파일 (필수)") MultipartFile posterImage,
            @Parameter(description = "소개 이미지 파일 목록 (선택, 최대 3개)") List<MultipartFile> detailImages
    );

    /**
     * 공연 가격 정책 등록 API를 문서화합니다.
     *
     * @param eventId 공연 식별자
     * @param request 공연 가격 정책 등록 요청 DTO
     * @return 성공 응답
     */
    @Operation(
            summary = "공연 가격 정책 등록",
            description = "기본정보가 등록된 공연에 가격 정책 목록을 추가합니다."
    )
    @ApiResponse(responseCode = "200", description = "가격 정책 등록 성공")
    @ApiResponse(
            responseCode = "400",
            description = "잘못된 요청값 또는 이미 가격 정책이 등록된 공연",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "공연을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<Void>> createPricePolicies(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1001")
            @UserId
            Long userId,
            @Parameter(description = "공연 식별자", required = true, example = "3011")
            Long eventId,
            @RequestBody(
                    required = true,
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    name = "가격 정책 등록 예시",
                                    value = """
                                            {
                                              "pricePolicies": [
                                                {
                                                  "priceGrade": "VIP",
                                                  "defaultPriceAmount": 220000,
                                                  "priceInfos": [
                                                    {
                                                      "discountName": "조기예매",
                                                      "discountRate": 10.0
                                                    }
                                                  ],
                                                  "currencyCode": "KRW",
                                                  "displayOrder": 0
                                                },
                                                {
                                                  "priceGrade": "R",
                                                  "defaultPriceAmount": 150000,
                                                  "priceInfos": [],
                                                  "currencyCode": "KRW",
                                                  "displayOrder": 1
                                                }
                                              ]
                                            }
                                            """
                            )
                    )
            )
            AgencyCreateEventPricePoliciesRequest request
    );

    /**
     * 공연 회차 등록 API를 문서화합니다.
     *
     * @param eventId 공연 식별자
     * @param request 공연 회차 등록 요청 DTO
     * @return 성공 응답
     */
    @Operation(
            summary = "공연 회차 등록",
            description = "기본정보가 등록된 공연에 회차 목록을 추가합니다. 회차 번호는 서버가 시작 시각 순으로 자동 부여합니다."
    )
    @ApiResponse(responseCode = "200", description = "회차 등록 성공")
    @ApiResponse(
            responseCode = "400",
            description = "잘못된 요청값",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "공연을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<Void>> createSessions(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1001")
            @UserId
            Long userId,
            @Parameter(description = "공연 식별자", required = true, example = "3011")
            Long eventId,
            @RequestBody(
                    required = true,
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    name = "회차 등록 예시",
                                    value = """
                                            {
                                              "sessions": [
                                                {
                                                  "startAt": "2026-07-01T19:00:00Z",
                                                  "endAt": "2026-07-01T22:00:00Z",
                                                  "salesOpenAt": "2026-06-01T00:00:00Z",
                                                  "salesCloseAt": "2026-06-30T23:59:59Z"
                                                }
                                              ]
                                            }
                                            """
                            )
                    )
            )
            AgencyCreateEventSessionsRequest request
    );

    /**
     * 공연 좌석 등록 API를 문서화합니다.
     *
     * @param eventId 공연 식별자
     * @param request 공연 좌석 등록 요청 DTO
     * @return 성공 응답
     */
    @Operation(
            summary = "공연 좌석 등록",
            description = "기본정보와 회차가 등록된 공연에 좌석 그룹을 가격 정책별로 추가합니다."
    )
    @ApiResponse(responseCode = "200", description = "좌석 등록 성공")
    @ApiResponse(
            responseCode = "400",
            description = "잘못된 요청값",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "공연 또는 공연장 좌석을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<Void>> createSeats(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1001")
            @UserId
            Long userId,
            @Parameter(description = "공연 식별자", required = true, example = "3011")
            Long eventId,
            @RequestBody(
                    required = true,
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    name = "좌석 등록 예시",
                                    value = """
                                            {
                                              "seats": [
                                                {
                                                  "priceGrade": "VIP",
                                                  "seatIds": [21001, 21002]
                                                },
                                                {
                                                  "priceGrade": "R",
                                                  "seatIds": [21003]
                                                }
                                              ]
                                            }
                                            """
                            )
                    )
            )
            AgencyCreateEventSeatsRequest request
    );

    /**
     * 공연 삭제 API를 문서화합니다.
     *
     * @param eventId 공연 식별자
     * @return 성공 응답
     */
    @Operation(
            summary = "공연 삭제",
            description = "기획사가 등록한 공연을 삭제합니다. 예매 시작 전인 공연만 삭제할 수 있으며, 회차/좌석/가격정책/이미지/찜 데이터도 함께 제거합니다."
    )
    @ApiResponse(responseCode = "200", description = "공연 삭제 성공")
    @ApiResponse(
            responseCode = "400",
            description = "예매가 이미 시작된 공연",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "공연을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<Void>> deleteEvent(
            @Parameter(description = "JWT에서 추출한 사용자 식별자", required = true, example = "1001")
            @UserId
            Long userId,
            @Parameter(description = "공연 식별자", required = true, example = "3011")
            Long eventId
    );
}
