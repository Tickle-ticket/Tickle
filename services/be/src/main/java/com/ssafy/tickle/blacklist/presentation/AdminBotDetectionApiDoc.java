package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.presentation.dto.BotDetectionStatsResponse;
import com.ssafy.tickle.common.response.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

/**
 * 어드민 봇 탐지 현황 API 문서 인터페이스입니다.
 */
@Tag(name = "Admin", description = "어드민 API")
public interface AdminBotDetectionApiDoc {

    /**
     * 봇 탐지 현황 조회 API 문서 정의입니다.
     *
     * @param userId 관리자 사용자 식별자
     * @return 봇 탐지 현황 통계 응답
     */
    @Operation(
            summary = "봇 탐지 현황 조회",
            description = "전체 블랙리스트 수, 사유별 통계, 최근 등록 10건을 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "봇 탐지 현황 조회 성공")
    ResponseEntity<BaseResponse<BotDetectionStatsResponse>> getStats(
            @Parameter(description = "관리자 사용자 식별자", required = true, example = "1") Long userId
    );
}
