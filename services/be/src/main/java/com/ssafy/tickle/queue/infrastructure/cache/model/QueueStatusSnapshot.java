package com.ssafy.tickle.queue.infrastructure.cache.model;

import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.domain.QueueScope;

import java.time.Instant;

/**
 * queueToken 기준 상태 조회에 필요한 Redis 스냅샷입니다.
 *
 * @param queueToken 대기열 토큰
 * @param requestId 요청 식별자
 * @param userId 사용자 식별자
 * @param scope 대기열 목적
 * @param sessionId 회차 식별자
 * @param status 현재 상태
 * @param registeredAt waiting 등록 시각
 * @param admitToken 입장 허용 토큰
 * @param admittedAt 입장 허용 시각
 */
public record QueueStatusSnapshot(
        String queueToken,
        String requestId,
        Long userId,
        QueueScope scope,
        Long sessionId,
        QueueRequestStatus status,
        Instant registeredAt,
        String admitToken,
        Instant admittedAt
) {
}
