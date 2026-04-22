package com.ssafy.tickle.queue.domain.messaging;

import java.time.Instant;

/**
 * 대기열 진입 요청 적재용 커맨드입니다.
 *
 * @param requestId 요청 식별자
 * @param userId 사용자 식별자
 * @param sessionId 회차 식별자
 * @param requestedAt 요청 시각
 */
public record QueueEnterCommand(
        String requestId,
        Long userId,
        Long sessionId,
        Instant requestedAt
) {
}
