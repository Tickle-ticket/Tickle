package com.ssafy.tickle.queue.infrastructure.cache.store;

import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.queue.infrastructure.cache.mapper.QueueEnterRequestReferenceHashMapper;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueEnterRequestReference;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * 대기열 진입 요청의 중복 등록 방지 키를 Redis에 저장합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueEnterRequestStore {

    private static final RedisScript<Long> SAVE_IF_ABSENT_SCRIPT = RedisScript.of("""
            local saved = redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[2])
            if not saved then
                return 0
            end

            redis.call('HSET', KEYS[2],
                'scope', ARGV[3],
                'eventId', ARGV[4],
                'userId', ARGV[5])
            redis.call('EXPIRE', KEYS[2], ARGV[2])
            return 1
            """, Long.class);

    private final StringRedisTemplate stringRedisTemplate;
    private final QueueEnterRequestReferenceHashMapper queueEnterRequestReferenceHashMapper;

    /**
     * 사용자-공연 조합으로 이미 저장된 요청 식별자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param eventId 공연 식별자
     * @return 기존 요청 식별자
     */
    public Optional<String> findRequestId(Long userId, Long eventId) {
        return findRequestId(QueueScope.BOOKING, userId, eventId);
    }

    public Optional<String> findRequestId(QueueScope scope, Long userId, Long eventId) {
        return Optional.ofNullable(stringRedisTemplate.opsForValue().get(enterKey(scope, userId, eventId)));
    }

    /**
     * 사용자-공연 조합으로 새 요청 식별자를 저장합니다.
     *
     * @param userId 사용자 식별자
     * @param eventId 공연 식별자
     * @param requestId 요청 식별자
     * @return 저장 성공 여부
     */
    public boolean saveIfAbsent(Long userId, Long eventId, String requestId) {
        return saveIfAbsent(QueueScope.BOOKING, userId, eventId, requestId);
    }

    public boolean saveIfAbsent(QueueScope scope, Long userId, Long eventId, String requestId) {
        Long saved = stringRedisTemplate.execute(
                SAVE_IF_ABSENT_SCRIPT,
                List.of(enterKey(scope, userId, eventId), referenceKey(requestId)),
                requestId,
                String.valueOf(QueueConstants.REQUEST_TTL.toSeconds()),
                scope.name(),
                String.valueOf(eventId),
                String.valueOf(userId)
        );

        return Long.valueOf(1L).equals(saved);
    }

    /**
     * requestId에 연결된 사용자/공연 식별자를 조회합니다.
     *
     * @param requestId 요청 식별자
     * @return 사용자/공연 식별자
     */
    public Optional<QueueEnterRequestReference> findReferenceByRequestId(String requestId) {
        return queueEnterRequestReferenceHashMapper.fromHash(
                stringRedisTemplate.opsForHash().entries(referenceKey(requestId))
        );
    }

    /**
     * 요청 적재 실패 시 사용자-공연 조합 키를 제거합니다.
     *
     * @param userId 사용자 식별자
     * @param eventId 공연 식별자
     */
    public void delete(Long userId, Long eventId, String requestId) {
        delete(QueueScope.BOOKING, userId, eventId, requestId);
    }

    public void delete(QueueScope scope, Long userId, Long eventId, String requestId) {
        stringRedisTemplate.delete(enterKey(scope, userId, eventId));
        stringRedisTemplate.delete(referenceKey(requestId));
    }

    private String enterKey(QueueScope scope, Long userId, Long eventId) {
        return QueueConstants.ENTER_KEY_PREFIX + scope.name() + ":" + eventId + ":" + userId;
    }

    private String referenceKey(String requestId) {
        return QueueConstants.ENTER_REFERENCE_KEY_PREFIX + requestId;
    }
}
