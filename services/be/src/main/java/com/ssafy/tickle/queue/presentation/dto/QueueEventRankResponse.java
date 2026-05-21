package com.ssafy.tickle.queue.presentation.dto;

public record QueueEventRankResponse(
        int rank,
        Long eventId,
        String eventName,
        String date,
        long waitCount,
        long expectedWaitMinutes
) {
}
