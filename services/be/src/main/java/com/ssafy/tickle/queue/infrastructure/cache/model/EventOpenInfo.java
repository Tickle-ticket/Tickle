package com.ssafy.tickle.queue.infrastructure.cache.model;

import java.time.Instant;

/**
 * 대기열 진입 검증에 사용하는 공연 메타데이터입니다.
 *
 * @param eventId 공연 식별자
 * @param salesOpenAt 예매 오픈 시각
 * @param salesCloseAt 예매 종료 시각
 */
public record EventOpenInfo(
        Long eventId,
        Instant salesOpenAt,
        Instant salesCloseAt
) {
}
