package com.ssafy.tickle.organizer.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.organizer.presentation.dto.OrganizerListResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 주최자 목록 API 문서 인터페이스입니다.
 */
@Tag(name = "Organizer", description = "주최자 목록 조회 API")
public interface OrganizerApiDoc {

    /**
     * 주최자 목록을 조회합니다.
     *
     * @return 주최자 목록 응답
     */
    @Operation(
            summary = "주최자 목록 조회",
            description = "공연 등록에 사용할 주최자의 ID와 이름만 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "주최자 목록 조회 성공")
    ResponseEntity<BaseResponse<OrganizerListResponse>> getOrganizers();
}
