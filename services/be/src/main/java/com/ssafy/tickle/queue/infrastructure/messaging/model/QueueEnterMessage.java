package com.ssafy.tickle.queue.infrastructure.messaging.model;

import com.ssafy.tickle.queue.domain.QueueScope;

import java.time.Instant;

/**
 * 대기열 진입 요청 적재용 커맨드입니다.
 *
 * @param requestId 요청 식별자
 * @param userId 사용자 식별자
 * @param scope 대기열 목적
 * @param eventId 공연 식별자
 * @param requestedAt 요청 시각
 */
public record QueueEnterMessage(
        String requestId,
        Long userId,
        QueueScope scope,
        Long eventId,
        Instant requestedAt
) {
}
