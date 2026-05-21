package com.ssafy.tickle.queue.presentation.dto;

import java.util.List;

public record QueueDashboardResponse(
        Long eventId,
        String eventName,
        long totalInflowLastHour,
        long currentWaiting,
        long waitingDifference, // 전 구간 대비 증감
        long peakWaiting,
        long peakTarget,
        long admissionsPerMinute,
        long admissionsDifference, // 유입 대비 증감
        long expectedWaitMinutes,
        long throughputPerMinute,
        List<QueueChartData> chartData
) {
    public record QueueChartData(
            String time,
            long waitCount,
            long inflowCount,
            long admittedCount,
            long expectedWaitMinutes
    ) {}
}
