package com.ssafy.tickle.user.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.user.application.ActiveUserStatsService;
import com.ssafy.tickle.user.presentation.dto.ActiveUserStatsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 전용 사용자 접속 통계 API 컨트롤러입니다.
 */
@Tag(name = "Admin User Stats", description = "관리자 사용자 접속 통계 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/users")
public class AdminUserStatsController {

    private final ActiveUserStatsService activeUserStatsService;

    /**
     * 오늘 기준 실시간 일반 사용자(USER 권한) 접속 통계를 조회합니다.
     *
     * <ul>
     *   <li>현재 접속자: 최근 30분 이내 API를 호출한 사용자 수</li>
     *   <li>피크: 오늘 최대 동시 접속자 수 (5분 단위 측정)</li>
     *   <li>평균: 오늘 5분 단위 스냅샷의 평균 접속자 수</li>
     * </ul>
     */
    @Operation(
            summary = "실시간 접속자 통계 조회",
            description = "기획사·관리자를 제외한 일반 사용자(USER 권한)의 당일 현재/피크/평균 접속자 수를 반환합니다."
    )
    @ApiResponse(responseCode = "200", description = "통계 조회 성공")
    @GetMapping("/stats")
    public ResponseEntity<BaseResponse<ActiveUserStatsResponse>> getActiveUserStats() {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(activeUserStatsService.getStats()));
    }
}
