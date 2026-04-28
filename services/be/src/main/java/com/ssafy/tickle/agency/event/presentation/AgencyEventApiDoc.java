package com.ssafy.tickle.agency.event.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventBasicRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventPricePoliciesRequest;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyCreateEventResponse;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSeatsRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSessionsRequest;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyVenueTemplateResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 기획사 공연 관리 API 문서 인터페이스입니다.
 *
 * <p>공연 기본정보, 가격 정책, 회차, 좌석, 공연장 템플릿 조회를 분리해서 문서화합니다.</p>
 */
@Tag(name = "Agency Event Management", description = "기획사 공연 기본정보/가격 정책/회차/좌석 등록 API")
public interface AgencyEventApiDoc {

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

    @Operation(
            summary = "공연 기본정보 등록",
            description = "기존 공연장과 카테고리를 기반으로 공연 기본정보만 먼저 등록합니다."
    )
    @ApiResponse(responseCode = "201", description = "공연 등록 성공")
    @ApiResponse(
            responseCode = "400",
            description = "잘못된 요청값",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    @ApiResponse(
            responseCode = "404",
            description = "기획사/공연장/카테고리/공연장 좌석을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = BaseResponse.class))
    )
    ResponseEntity<BaseResponse<AgencyCreateEventResponse>> createEvent(
            @RequestBody(
                    required = true,
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    name = "공연 기본정보 등록 예시",
                                    value = """
                                            {
                                              "organizerId": 2001,
                                              "venueId": 2001,
                                              "categoryId": 2001,
                                              "title": "기획사 등록 샘플 공연",
                                              "salesStartAt": "2026-06-01T00:00:00Z",
                                              "salesEndAt": "2026-06-20T00:00:00Z",
                                              "eventStartAt": "2026-07-01T19:00:00Z",
                                              "eventEndAt": "2026-07-01T22:00:00Z",
                                              "tags": ["admin", "sample"],
                                              "notice": "기획사 API 샘플 공연입니다."
                                            }
                                            """
                            )
                    )
            )
            AgencyCreateEventBasicRequest request
    );

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
                                                  "priceAmount": 220000,
                                                  "discountInfo": [
                                                    {
                                                      "discountName": "조기예매",
                                                      "discountRate": 10.0,
                                                      "actualPriceAmount": 198000
                                                    }
                                                  ],
                                                  "currencyCode": "KRW",
                                                  "displayOrder": 0
                                                },
                                                {
                                                  "priceGrade": "R",
                                                  "priceAmount": 150000,
                                                  "discountInfo": [],
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
}
