package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.application.BotDetectionService;
import com.ssafy.tickle.blacklist.presentation.dto.BotDetectionStatsResponse;
import com.ssafy.tickle.common.response.BaseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 어드민 봇 탐지 현황 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/admin/bot")
@RequiredArgsConstructor
public class AdminBotDetectionController implements AdminBotDetectionApiDoc {

    private final BotDetectionService botDetectionService;

    /**
     * 봇 탐지 현황 통계를 조회합니다.
     *
     * @param userId 관리자 사용자 식별자 (AdminAuthInterceptor에서 검증)
     * @return 봇 탐지 현황 통계 응답
     */
    @Override
    @GetMapping("/stats")
    public ResponseEntity<BaseResponse<BotDetectionStatsResponse>> getStats() {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(botDetectionService.getStats()));
    }
}
