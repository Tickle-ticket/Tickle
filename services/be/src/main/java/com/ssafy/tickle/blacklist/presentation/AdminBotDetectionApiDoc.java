package com.ssafy.tickle.blacklist.presentation;

import com.ssafy.tickle.blacklist.presentation.dto.BotDetectionStatsResponse;
import com.ssafy.tickle.common.response.BaseResponse;
import io.swagger.v3.oas.annotations.Operation;
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
     * @return 봇 탐지 현황 통계 응답
     */
    @Operation(
            summary = "봇 탐지 현황 조회",
            description = """
                    실시간 봇 탐지 통계를 반환합니다.
                    - totalBlacklisted: 전체 누적 차단 수
                    - recentOneHourCount: 최근 1시간 탐지 건수 (현재 공격 여부 파악)
                    - blockedIpCount: 블랙리스트 유저들의 고유 IP 수 (다중 계정 공격 탐지)
                    - byReason: 탐지 사유별 건수 (BOT_DETECTED, IP_RATE_LIMIT 등)
                    - scoreDistribution: AI 봇 판별 확률 구간별 분포 (pMacro 기반)
                    - recentItems: 최근 등록 10건 목록
                    """
    )
    @ApiResponse(responseCode = "200", description = "봇 탐지 현황 조회 성공")
    ResponseEntity<BaseResponse<BotDetectionStatsResponse>> getStats();
}
