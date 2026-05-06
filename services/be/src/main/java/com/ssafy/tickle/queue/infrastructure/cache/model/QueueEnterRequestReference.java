package com.ssafy.tickle.queue.infrastructure.cache.model;

import com.ssafy.tickle.queue.domain.QueueScope;

/**
 * requestId로 역추적한 대기열 진입 요청의 사용자/회차 식별자입니다.
 *
 * @param scope 대기열 목적
 * @param sessionId 회차 식별자
 * @param userId 사용자 식별자
 */
public record QueueEnterRequestReference(
        QueueScope scope,
        Long sessionId,
        Long userId
) {
}
