package com.ssafy.tickle.blacklist.presentation.dto;

import java.util.List;

/**
 * 봇 탐지 현황 통계 응답 DTO입니다.
 *
 * @param totalBlacklisted     전체 블랙리스트 수
 * @param recentOneHourCount   최근 1시간 내 탐지 건수
 * @param blockedIpCount       블랙리스트 유저들의 고유 IP 수
 * @param byReason             탐지 사유별 통계
 * @param scoreDistribution    AI 봇 판별 확률 구간별 분포
 * @param recentItems          최근 등록 10건
 */
public record BotDetectionStatsResponse(
        long totalBlacklisted,
        long recentOneHourCount,
        long blockedIpCount,
        List<ReasonStat> byReason,
        List<ScoreBucket> scoreDistribution,
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
     * AI 봇 판별 확률 구간별 분포입니다.
     *
     * @param scoreRange 점수 구간 (예: "0.8-1.0")
     * @param count      해당 구간의 탐지 건수
     */
    public record ScoreBucket(String scoreRange, long count) {
    }

    /**
     * 봇 탐지 현황 통계 응답 DTO를 생성합니다.
     */
    public static BotDetectionStatsResponse from(
            long total,
            long recentOneHourCount,
            long blockedIpCount,
            List<ReasonStat> byReason,
            List<ScoreBucket> scoreDistribution,
            List<BlacklistResponse> recent
    ) {
        return new BotDetectionStatsResponse(total, recentOneHourCount, blockedIpCount, byReason, scoreDistribution, recent);
    }
}
