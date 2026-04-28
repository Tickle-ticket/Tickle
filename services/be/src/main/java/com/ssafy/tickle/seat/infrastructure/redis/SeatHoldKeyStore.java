package com.ssafy.tickle.seat.infrastructure.redis;

import lombok.RequiredArgsConstructor;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * 좌석 선점 정보를 Redis에 저장·조회·삭제하는 컴포넌트입니다.
 *
 * <p>키 형식: {@code held:{scheduleId}:{userId}}</p>
 * <p>값: 선점된 sessionSeatId 목록 (List&lt;Long&gt;)</p>
 * <p>TTL: 15분 — 만료 이벤트 처리는 WebSocket 이슈에서 구현 예정</p>
 */
@Component
@RequiredArgsConstructor
public class SeatHoldKeyStore {

    private static final Duration HOLD_TTL = Duration.ofMinutes(15);
    private static final String KEY_PREFIX = "held:";

    private final RedissonClient redissonClient;

    /**
     * 사용자의 선점 좌석 목록을 Redis에 저장합니다.
     *
     * @param scheduleId   회차 ID
     * @param userId       선점 사용자 ID
     * @param sessionSeatIds 선점된 sessionSeat ID 목록
     */
    public void registerHeld(Long scheduleId, Long userId, List<Long> sessionSeatIds) {
        RBucket<List<Long>> bucket = redissonClient.getBucket(buildKey(scheduleId, userId));
        bucket.set(sessionSeatIds, HOLD_TTL);
    }

    /**
     * 사용자가 해당 회차에서 선점한 좌석 ID 목록을 조회합니다.
     *
     * @param scheduleId 회차 ID
     * @param userId     사용자 ID
     * @return 선점 중인 sessionSeatId 목록 (없으면 빈 리스트)
     */
    public List<Long> getHeldSeatIds(Long scheduleId, Long userId) {
        RBucket<List<Long>> bucket = redissonClient.getBucket(buildKey(scheduleId, userId));
        List<Long> ids = bucket.get();
        return ids != null ? ids : Collections.emptyList();
    }

    /**
     * 사용자의 선점 키를 삭제합니다.
     *
     * @param scheduleId 회차 ID
     * @param userId     사용자 ID
     */
    public void deleteHeld(Long scheduleId, Long userId) {
        redissonClient.getBucket(buildKey(scheduleId, userId)).delete();
    }

    /**
     * 선점 잔여 만료 시각을 반환합니다.
     *
     * @param scheduleId 회차 ID
     * @param userId     사용자 ID
     * @return 남은 TTL Duration (키 없으면 Duration.ZERO)
     */
    public Duration getRemainingTtl(Long scheduleId, Long userId) {
        long remainMs = redissonClient.getBucket(buildKey(scheduleId, userId))
                .remainTimeToLive();
        return remainMs > 0 ? Duration.ofMillis(remainMs) : Duration.ZERO;
    }

    private String buildKey(Long scheduleId, Long userId) {
        return KEY_PREFIX + scheduleId + ":" + userId;
    }
}
