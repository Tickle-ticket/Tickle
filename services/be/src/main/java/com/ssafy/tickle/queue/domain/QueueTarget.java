package com.ssafy.tickle.queue.domain;

/**
 * 대기열 상태 집계와 admission을 수행하는 단위입니다.
 *
 * @param scope 대기열 목적
 * @param sessionId 회차 식별자
 */
public record QueueTarget(
        QueueScope scope,
        Long sessionId
) {
}
