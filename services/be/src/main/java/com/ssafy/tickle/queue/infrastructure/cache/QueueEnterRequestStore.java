package com.ssafy.tickle.queue.infrastructure.cache;

import com.ssafy.tickle.queue.infrastructure.cache.model.QueueEnterRequestReference;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

/**
 * 대기열 진입 요청의 중복 등록 방지 키를 Redis에 저장합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueEnterRequestStore {

    private static final Duration REQUEST_TTL = Duration.ofMinutes(5);
    private static final String SESSION_ID = "sessionId";
    private static final String USER_ID = "userId";

    private final StringRedisTemplate stringRedisTemplate;

    /**
     * 사용자-회차 조합으로 이미 저장된 요청 식별자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @return 기존 요청 식별자
     */
    public Optional<String> findRequestId(Long userId, Long sessionId) {
        return Optional.ofNullable(stringRedisTemplate.opsForValue().get(enterKey(userId, sessionId)));
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
                enterKey(userId, sessionId),
                requestId,
                REQUEST_TTL
        );

        if (Boolean.TRUE.equals(saved)) {
            String referenceKey = referenceKey(requestId);
            stringRedisTemplate.opsForHash().putAll(referenceKey, Map.of(
                    SESSION_ID, String.valueOf(sessionId),
                    USER_ID, String.valueOf(userId)
            ));
            stringRedisTemplate.expire(referenceKey, REQUEST_TTL);
        }

        return Boolean.TRUE.equals(saved);
    }

    /**
     * requestId에 연결된 사용자/회차 식별자를 조회합니다.
     *
     * @param requestId 요청 식별자
     * @return 사용자/회차 식별자
     */
    public Optional<QueueEnterRequestReference> findReferenceByRequestId(String requestId) {
        Map<Object, Object> entries = stringRedisTemplate.opsForHash().entries(referenceKey(requestId));
        if (entries.isEmpty()) {
            return Optional.empty();
        }

        Object sessionId = entries.get(SESSION_ID);
        Object userId = entries.get(USER_ID);
        if (sessionId == null || userId == null) {
            return Optional.empty();
        }

        return Optional.of(new QueueEnterRequestReference(
                Long.parseLong(sessionId.toString()),
                Long.parseLong(userId.toString())
        ));
    }

    /**
     * 요청 적재 실패 시 사용자-회차 조합 키를 제거합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     */
    public void delete(Long userId, Long sessionId, String requestId) {
        stringRedisTemplate.delete(enterKey(userId, sessionId));
        stringRedisTemplate.delete(referenceKey(requestId));
    }

    private String enterKey(Long userId, Long sessionId) {
        return "queue:enter:" + sessionId + ":" + userId;
    }

    private String referenceKey(String requestId) {
        return "queue:enter:reference:" + requestId;
    }
}
