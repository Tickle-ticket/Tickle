package com.ssafy.tickle.blacklist.presentation.dto;

import java.util.List;

/**
 * 봇 탐지 현황 통계 응답 DTO입니다.
 *
 * @param totalBlacklisted 전체 블랙리스트 수
 * @param byReason         사유별 통계
 * @param recentItems      최근 등록 10건
 */
public record BotDetectionStatsResponse(
        long totalBlacklisted,
        List<ReasonStat> byReason,
        List<BlacklistResponse> recentItems
) {

    /**
     * 사유별 블랙리스트 통계입니다.
     *
     * @param reason 블랙리스트 등록 사유
     * @param count  해당 사유로 등록된 수
     */
    public record ReasonStat(String reason, long count) {
    }

    /**
     * 봇 탐지 현황 통계 응답 DTO를 생성합니다.
     *
     * @param total    전체 블랙리스트 수
     * @param byReason 사유별 통계 목록
     * @param recent   최근 등록 10건
     * @return 봇 탐지 현황 통계 응답 DTO
     */
    public static BotDetectionStatsResponse from(
            long total,
            List<ReasonStat> byReason,
            List<BlacklistResponse> recent
    ) {
        return new BotDetectionStatsResponse(total, byReason, recent);
    }
}
