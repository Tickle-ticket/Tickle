package com.ssafy.tickle.queue.infrastructure.cache;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * 대기열 진입 요청의 중복 등록 방지 키를 Redis에 저장합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueEnterRequestCache {

    private static final Duration REQUEST_TTL = Duration.ofMinutes(5);

    private final StringRedisTemplate stringRedisTemplate;

    /**
     * 사용자-회차 조합으로 이미 저장된 요청 식별자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @return 기존 요청 식별자
     */
    public Optional<String> findRequestId(Long userId, Long sessionId) {
        return Optional.ofNullable(stringRedisTemplate.opsForValue().get(key(userId, sessionId)));
    }

    /**
     * 사용자-회차 조합으로 새 요청 식별자를 저장합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @param requestId 요청 식별자
     * @return 저장 성공 여부
     */
    public boolean saveIfAbsent(Long userId, Long sessionId, String requestId) {
        Boolean saved = stringRedisTemplate.opsForValue().setIfAbsent(
                key(userId, sessionId),
                requestId,
                REQUEST_TTL
        );

        return Boolean.TRUE.equals(saved);
    }

    /**
     * 요청 적재 실패 시 사용자-회차 조합 키를 제거합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     */
    public void delete(Long userId, Long sessionId) {
        stringRedisTemplate.delete(key(userId, sessionId));
    }

    private String key(Long userId, Long sessionId) {
        return "queue:enter:" + sessionId + ":" + userId;
    }
}
