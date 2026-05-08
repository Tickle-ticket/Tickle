package com.ssafy.tickle.venue.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.venue.presentation.dto.VenueListResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 공연장 목록 API 문서 인터페이스입니다.
 */
@Tag(name = "Venue", description = "공연장 목록 조회 API")
public interface VenueApiDoc {

    /**
     * 공연장 목록을 조회합니다.
     *
     * @return 공연장 목록 응답
     */
    @Operation(
            summary = "공연장 목록 조회",
            description = "공연 등록과 일반 조회에서 사용할 공연장의 ID와 이름만 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "공연장 목록 조회 성공")
    ResponseEntity<BaseResponse<VenueListResponse>> getVenues();
}
