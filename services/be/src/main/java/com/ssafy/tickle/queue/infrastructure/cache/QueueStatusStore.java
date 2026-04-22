package com.ssafy.tickle.queue.infrastructure.cache;

import com.ssafy.tickle.queue.infrastructure.cache.mapper.QueueStatusHashMapper;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueStatusSnapshot;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;

/**
 * 대기열 상태 조회에 필요한 queueToken 메타데이터와 waiting 순서를 Redis에 저장합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueStatusStore {

    private static final String STATUS_KEY_PREFIX = "queue:status:";
    private static final String WAITING_KEY_PREFIX = "queue:waiting:";
    private static final String ADMISSION_HISTORY_KEY_PREFIX = "queue:admission:history:";

    private final StringRedisTemplate stringRedisTemplate;
    private final QueueStatusHashMapper queueStatusHashMapper;

    /**
     * queueToken을 WAITING 상태로 최초 등록합니다.
     *
     * @param queueToken 대기열 토큰
     * @param requestId 요청 식별자
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @param registeredAt 대기열 등록 시각
     */
    public void registerWaitingIfAbsent(
            String queueToken,
            String requestId,
            Long userId,
            Long sessionId,
            Instant registeredAt
    ) {
        String statusKey = statusKey(queueToken);
        if (Boolean.TRUE.equals(stringRedisTemplate.hasKey(statusKey))) {
            return;
        }

        // 개별 사용자 상태를 조회할 때 사용
        stringRedisTemplate.opsForHash().putAll(
                statusKey,
                queueStatusHashMapper.toHash(requestId, userId, sessionId, QueueRequestStatus.WAITING, registeredAt)
        );

        // 해당 회차에서 현재 순번을 계산할 때 사용
        stringRedisTemplate.opsForZSet().add(waitingKey(sessionId), queueToken, registeredAt.toEpochMilli());
    }

    /**
     * queueToken 메타데이터를 조회합니다.
     *
     * @param queueToken 대기열 토큰
     * @return 상태 메타데이터
     */
    public Optional<QueueStatusSnapshot> findSnapshot(String queueToken) {
        // Redis hash를 내부 스냅샷으로 변환한 뒤 서비스가 rank/ETA 계산에 사용.
        return queueStatusHashMapper.fromHash(
                queueToken,
                stringRedisTemplate.opsForHash().entries(statusKey(queueToken))
        );
    }

    /**
     * 현재 waiting 순번을 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @param queueToken 대기열 토큰
     * @return 1-based 순번
     */
    public Long findRank(Long sessionId, String queueToken) {
        Long rank = stringRedisTemplate.opsForZSet().rank(waitingKey(sessionId), queueToken);
        return rank == null ? null : rank + 1;
    }

    /**
     * 현재 waiting 인원 수를 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @return waiting 인원 수
     */
    public long countWaiting(Long sessionId) {
        Long waitingCount = stringRedisTemplate.opsForZSet().zCard(waitingKey(sessionId));
        return waitingCount == null ? 0L : waitingCount;
    }

    /**
     * 최근 admission 처리량 계산용 기록 수를 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @param from 시작 시각
     * @param to 종료 시각
     * @return 최근 admission 수
     */
    public long countRecentAdmissions(Long sessionId, Instant from, Instant to) {
        Long admittedCount = stringRedisTemplate.opsForZSet().count(
                admissionHistoryKey(sessionId),
                from.toEpochMilli(),
                to.toEpochMilli()
        );

        return admittedCount == null ? 0L : admittedCount;
    }

    private String statusKey(String queueToken) {
        return STATUS_KEY_PREFIX + queueToken;
    }

    private String waitingKey(Long sessionId) {
        return WAITING_KEY_PREFIX + sessionId;
    }

    private String admissionHistoryKey(Long sessionId) {
        return ADMISSION_HISTORY_KEY_PREFIX + sessionId;
    }
}
