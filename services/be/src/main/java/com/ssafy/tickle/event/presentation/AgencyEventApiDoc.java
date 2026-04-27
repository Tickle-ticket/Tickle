package com.ssafy.tickle.event.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyCreateEventRequest;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyCreateEventResponse;
import com.ssafy.tickle.event.presentation.dto.agency.AgencyVenueTemplateResponse;
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
 */
@Tag(name = "Agency Event Management", description = "기획사 공연/회차/좌석 등록 API")
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
            summary = "공연/회차/좌석 일괄 등록",
            description = "기존 공연장 골격을 기반으로 공연, 가격 정책, 회차, 공연 좌석, 회차 좌석을 한 번에 생성합니다."
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
                                    name = "공연 등록 예시",
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
                                              "notice": "기획사 API 샘플 공연입니다.",
                                              "pricePolicies": [
                                                {
                                                  "priceGrade": "VIP",
                                                  "audienceType": "ALL",
                                                  "salePriceAmount": 150000,
                                                  "currencyCode": "KRW",
                                                  "displayOrder": 1
                                                },
                                                {
                                                  "priceGrade": "R",
                                                  "audienceType": "ALL",
                                                  "salePriceAmount": 100000,
                                                  "currencyCode": "KRW",
                                                  "displayOrder": 2
                                                }
                                              ],
                                              "sessions": [
                                                {
                                                  "sessionNo": 1,
                                                  "startAt": "2026-07-01T19:00:00Z",
                                                  "endAt": "2026-07-01T22:00:00Z",
                                                  "salesOpenAt": "2026-06-01T00:00:00Z",
                                                  "salesCloseAt": "2026-06-30T23:59:59Z"
                                                }
                                              ],
                                              "seats": [
                                                {
                                                  "venueSeatId": 21001,
                                                  "priceGrade": "VIP",
                                                  "audienceType": "ALL"
                                                },
                                                {
                                                  "venueSeatId": 21003,
                                                  "priceGrade": "R",
                                                  "audienceType": "ALL"
                                                }
                                              ]
                                            }
                                            """
                            )
                    )
            )
            AgencyCreateEventRequest request
    );
}
