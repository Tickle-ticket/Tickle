package com.ssafy.tickle.venue.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.venue.presentation.dto.AgencyVenueListResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 기획사 공연장 조회 API 문서 인터페이스입니다.
 */
@Tag(name = "Agency Venue", description = "기획사 공연장 조회 API")
public interface AgencyVenueApiDoc {

    @Operation(
            summary = "공연장 목록 조회",
            description = "기획사가 공연 등록 전에 선택할 수 있도록 공연장 이름, 기본 주소, 수용 인원 목록을 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "공연장 목록 조회 성공")
    ResponseEntity<BaseResponse<AgencyVenueListResponse>> getVenues();
}
