package com.ssafy.tickle.queue.infrastructure.cache.store;

import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.queue.infrastructure.cache.mapper.QueueEnterRequestReferenceHashMapper;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueEnterRequestReference;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 대기열 진입 요청의 중복 등록 방지 키를 Redis에 저장합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueEnterRequestStore {

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
        Boolean saved = stringRedisTemplate.opsForValue().setIfAbsent(
                enterKey(scope, userId, eventId),
                requestId,
                QueueConstants.REQUEST_TTL
        );

        if (Boolean.TRUE.equals(saved)) {
            // requestId만으로 다시 사용자/공연를 복구할 수 있게 reference hash를 별도로 둔다.
            String referenceKey = referenceKey(requestId);
            stringRedisTemplate.opsForHash().putAll(
                    referenceKey,
                    queueEnterRequestReferenceHashMapper.toHash(scope, eventId, userId)
            );
            stringRedisTemplate.expire(referenceKey, QueueConstants.REQUEST_TTL);
        }

        return Boolean.TRUE.equals(saved);
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
