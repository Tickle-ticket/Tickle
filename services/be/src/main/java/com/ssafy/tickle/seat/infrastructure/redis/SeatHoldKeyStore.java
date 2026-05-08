package com.ssafy.tickle.seat.infrastructure.redis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * 좌석 선점 정보를 Redis에 저장·조회·삭제하는 컴포넌트입니다.
 *
 * <p>키 형식: {@code held:{scheduleId}:{userId}}</p>
 * <p>값: 선점된 sessionSeatId 목록 (JSON)</p>
 * <p>TTL: 15분 — 만료 이벤트 처리는 {@code SeatHoldExpiredListener} 담당</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SeatHoldKeyStore {

    private static final Duration HOLD_TTL = Duration.ofMinutes(15);
    private static final String KEY_PREFIX = "held:";
    private static final TypeReference<List<Long>> LIST_LONG = new TypeReference<>() {};

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 사용자의 선점 좌석 목록을 Redis에 저장합니다.
     *
     * @param scheduleId     회차 ID
     * @param userId         선점 사용자 ID
     * @param sessionSeatIds 선점된 sessionSeat ID 목록
     */
    public void registerHeld(Long scheduleId, Long userId, List<Long> sessionSeatIds) {
        try {
            stringRedisTemplate.opsForValue().set(
                    buildKey(scheduleId, userId),
                    objectMapper.writeValueAsString(sessionSeatIds),
                    HOLD_TTL
            );
        } catch (JsonProcessingException e) {
            log.warn("좌석 선점 Redis 저장 실패: scheduleId={}, userId={}", scheduleId, userId, e);
        }
    }

    /**
     * 사용자가 해당 회차에서 선점한 좌석 ID 목록을 조회합니다.
     *
     * @param scheduleId 회차 ID
     * @param userId     사용자 ID
     * @return 선점 중인 sessionSeatId 목록 (없으면 빈 리스트)
     */
    public List<Long> getHeldSeatIds(Long scheduleId, Long userId) {
        String json = stringRedisTemplate.opsForValue().get(buildKey(scheduleId, userId));
        if (json == null) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, LIST_LONG);
        } catch (JsonProcessingException e) {
            log.warn("좌석 선점 Redis 조회 실패: scheduleId={}, userId={}", scheduleId, userId, e);
            return Collections.emptyList();
        }
    }

    /**
     * 사용자의 선점 키 만료 시각을 조회합니다.
     *
     * @param scheduleId 회차 ID
     * @param userId     사용자 ID
     * @return 만료 시각 Optional
     */
    public Optional<Instant> getHeldExpiresAt(Long scheduleId, Long userId) {
        Long ttlMillis = stringRedisTemplate.getExpire(buildKey(scheduleId, userId),
                java.util.concurrent.TimeUnit.MILLISECONDS);
        if (ttlMillis == null || ttlMillis <= 0) {
            return Optional.empty();
        }
        return Optional.of(Instant.now().plusMillis(ttlMillis));
    }

    /**
     * 사용자의 선점 키를 삭제합니다.
     *
     * @param scheduleId 회차 ID
     * @param userId     사용자 ID
     */
    public void deleteHeld(Long scheduleId, Long userId) {
        stringRedisTemplate.delete(buildKey(scheduleId, userId));
    }

    private String buildKey(Long scheduleId, Long userId) {
        return KEY_PREFIX + scheduleId + ":" + userId;
    }
}
