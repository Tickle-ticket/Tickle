package com.ssafy.tickle.event.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.event.presentation.dto.EventDetailResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 이벤트 조회 API 문서 인터페이스입니다.
 */
@Tag(name = "Event", description = "공연 이벤트 조회 API")
public interface EventApiDoc {

    /**
     * 이벤트 상세 조회 API 문서 정의입니다.
     *
     * @param eventId 이벤트 식별자
     * @return 이벤트 상세 응답
     */
    @Operation(
            summary = "이벤트 상세 조회",
            description = "이벤트 상세 정보를 조회합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "이벤트 상세 조회 성공"
    )
    @ApiResponse(responseCode = "404", description = "이벤트를 찾을 수 없음")
    ResponseEntity<BaseResponse<EventDetailResponse>> getEventDetail(
            @Parameter(description = "이벤트 식별자", required = true)
            Long eventId
    );
}
