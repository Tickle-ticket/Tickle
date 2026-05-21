package com.ssafy.tickle.blacklist.presentation.dto;

import java.util.List;

public record BlacklistDashboardResponse(
        long totalConnectionsToday,
        long botDetectionCount,
        double blockRate,
        long blockedCount,
        String peakTime,
        long peakDetectionCount,
        List<BlacklistChartData> chartData
) {
    public record BlacklistChartData(
            String hour,
            long sectionBlocked,
            long cumulativeDetected,
            long bypassCount,
            long macroCount,
            long abnormalCount
    ) {}
}
