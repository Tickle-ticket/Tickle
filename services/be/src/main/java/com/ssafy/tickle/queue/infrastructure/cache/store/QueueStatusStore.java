package com.ssafy.tickle.queue.infrastructure.cache.store;

import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.infrastructure.cache.mapper.QueueStatusHashMapper;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueStatusSnapshot;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.queue.domain.QueueTarget;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

/**
 * 대기열 상태 조회에 필요한 queueToken 메타데이터와 waiting 순서를 Redis에 저장합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueStatusStore {

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
        registerWaitingIfAbsent(queueToken, requestId, userId, QueueScope.BOOKING, sessionId, registeredAt);
    }

    public void registerWaitingIfAbsent(
            String queueToken,
            String requestId,
            Long userId,
            QueueScope scope,
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
                queueStatusHashMapper.toHash(requestId, userId, scope, sessionId, QueueRequestStatus.WAITING, registeredAt)
        );
        stringRedisTemplate.expire(statusKey, QueueConstants.QUEUE_TOKEN_TTL);

        // 해당 회차에서 현재 순번을 계산할 때 사용
        stringRedisTemplate.opsForZSet().add(waitingKey(scope, sessionId), queueToken, registeredAt.toEpochMilli());
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
     * admitToken에 연결된 queueToken을 조회합니다.
     *
     * @param admitToken 입장 허용 토큰
     * @return queueToken
     */
    public Optional<String> findQueueTokenByAdmitToken(String admitToken) {
        return Optional.ofNullable(stringRedisTemplate.opsForValue().get(admitTokenKey(admitToken)));
    }

    /**
     * 현재 waiting 순번을 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @param queueToken 대기열 토큰
     * @return 1-based 순번
     */
    public Long findRank(Long sessionId, String queueToken) {
        return findRank(QueueScope.BOOKING, sessionId, queueToken);
    }

    public Long findRank(QueueScope scope, Long sessionId, String queueToken) {
        Long rank = stringRedisTemplate.opsForZSet().rank(waitingKey(scope, sessionId), queueToken);
        return rank == null ? null : rank + 1;
    }

    /**
     * 현재 waiting 인원 수를 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @return waiting 인원 수
     */
    public long countWaiting(Long sessionId) {
        return countWaiting(QueueScope.BOOKING, sessionId);
    }

    public long countWaiting(QueueScope scope, Long sessionId) {
        Long waitingCount = stringRedisTemplate.opsForZSet().zCard(waitingKey(scope, sessionId));
        return waitingCount == null ? 0L : waitingCount;
    }

    /**
     * 현재 입장 허용된 인원 수를 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @return 입장 허용 인원 수
     */
    public long countAdmitted(Long sessionId) {
        return countAdmitted(QueueScope.BOOKING, sessionId);
    }

    public long countAdmitted(QueueScope scope, Long sessionId) {
        Long admittedCount = stringRedisTemplate.opsForZSet().zCard(admittedKey(scope, sessionId));
        return admittedCount == null ? 0L : admittedCount;
    }

    /**
     * 현재 ADMITTED 사용자가 존재하는 회차 목록을 조회합니다.
     */
    public Set<QueueTarget> findAdmittedTargets() {
        Set<String> keys = stringRedisTemplate.keys(QueueConstants.ADMITTED_KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return Set.of();
        }

        Set<QueueTarget> targets = new java.util.HashSet<>();
        for (String key : keys) {
            parseTarget(key, QueueConstants.ADMITTED_KEY_PREFIX).ifPresent(targets::add);
        }
        return targets;
    }

    public Set<Long> findAdmittedSessionIds() {
        Set<Long> sessionIds = new java.util.HashSet<>();
        for (QueueTarget target : findAdmittedTargets()) {
            if (target.scope() == QueueScope.BOOKING) {
                sessionIds.add(target.sessionId());
            }
        }
        return sessionIds;
    }

    public Set<String> findWaitingQueueTokens(Long sessionId) {
        return findWaitingQueueTokens(QueueScope.BOOKING, sessionId);
    }

    public Set<String> findWaitingQueueTokens(QueueScope scope, Long sessionId) {
        Set<String> queueTokens = stringRedisTemplate.opsForZSet().range(waitingKey(scope, sessionId), 0, -1);
        return queueTokens == null ? Set.of() : queueTokens;
    }

    public Set<String> findAdmittedQueueTokens(Long sessionId) {
        return findAdmittedQueueTokens(QueueScope.BOOKING, sessionId);
    }

    public Set<String> findAdmittedQueueTokens(QueueScope scope, Long sessionId) {
        Set<String> queueTokens = stringRedisTemplate.opsForZSet().range(admittedKey(scope, sessionId), 0, -1);
        return queueTokens == null ? Set.of() : queueTokens;
    }

    public void removeWaitingQueueToken(Long sessionId, String queueToken) {
        removeWaitingQueueToken(QueueScope.BOOKING, sessionId, queueToken);
    }

    public void removeWaitingQueueToken(QueueScope scope, Long sessionId, String queueToken) {
        stringRedisTemplate.opsForZSet().remove(waitingKey(scope, sessionId), queueToken);
    }

    public void removeAdmittedQueueToken(Long sessionId, String queueToken) {
        removeAdmittedQueueToken(QueueScope.BOOKING, sessionId, queueToken);
    }

    public void removeAdmittedQueueToken(QueueScope scope, Long sessionId, String queueToken) {
        stringRedisTemplate.opsForZSet().remove(admittedKey(scope, sessionId), queueToken);
    }

    /**
     * waiting 상태 사용자 중 상위 N명을 ADMITTED 상태로 전이합니다.
     *
     * @param sessionId 회차 식별자
     * @param limit 입장시킬 최대 인원 수
     * @param admittedAt 입장 처리 시각
     */
    public void admitWaitingUsers(Long sessionId, long limit, Instant admittedAt) {
        admitWaitingUsers(QueueScope.BOOKING, sessionId, limit, admittedAt);
    }

    public void admitWaitingUsers(QueueScope scope, Long sessionId, long limit, Instant admittedAt) {
        if (limit <= 0) {
            return;
        }

        Set<String> queueTokens = stringRedisTemplate.opsForZSet().range(waitingKey(scope, sessionId), 0, limit - 1);
        if (queueTokens == null || queueTokens.isEmpty()) {
            return;
        }

        for (String queueToken : queueTokens) {
            QueueStatusSnapshot snapshot = findSnapshot(queueToken).orElse(null);
            if (snapshot == null || snapshot.status() != QueueRequestStatus.WAITING) {
                continue;
            }

            String admitToken = java.util.UUID.randomUUID().toString();

            // WAITING -> ADMITTED 전이 시점에만 admitToken과 admission history를 함께 기록한다.
            stringRedisTemplate.opsForHash().putAll(
                    statusKey(queueToken),
                    queueStatusHashMapper.toAdmittedFields(admitToken, admittedAt)
            );
            // admitToken은 좌석/결제 단계에서 유효성 확인에 쓸 수 있도록 별도 TTL 키로도 보관한다.
            stringRedisTemplate.opsForValue().set(admitTokenKey(admitToken), queueToken, QueueConstants.ADMIT_TOKEN_TTL);
            stringRedisTemplate.opsForZSet().remove(waitingKey(scope, sessionId), queueToken);
            stringRedisTemplate.opsForZSet().add(admittedKey(scope, sessionId), queueToken, admittedAt.toEpochMilli());
            stringRedisTemplate.opsForZSet().add(admissionHistoryKey(scope, sessionId), queueToken, admittedAt.toEpochMilli());
        }
    }

    /**
     * waiting 사용자가 존재하는 회차 목록을 조회합니다.
     *
     * @return waiting zset이 존재하는 회차 식별자 목록
     */
    public Set<QueueTarget> findWaitingTargets() {
        Set<String> keys = stringRedisTemplate.keys(QueueConstants.WAITING_KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return Set.of();
        }

        Set<QueueTarget> targets = new java.util.HashSet<>();
        for (String key : keys) {
            parseTarget(key, QueueConstants.WAITING_KEY_PREFIX).ifPresent(targets::add);
        }
        return targets;
    }

    public Set<Long> findWaitingSessionIds() {
        Set<Long> sessionIds = new java.util.HashSet<>();
        for (QueueTarget target : findWaitingTargets()) {
            if (target.scope() == QueueScope.BOOKING) {
                sessionIds.add(target.sessionId());
            }
        }
        return sessionIds;
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
        return countRecentAdmissions(QueueScope.BOOKING, sessionId, from, to);
    }

    public long countRecentAdmissions(QueueScope scope, Long sessionId, Instant from, Instant to) {
        Long admittedCount = stringRedisTemplate.opsForZSet().count(
                admissionHistoryKey(scope, sessionId),
                from.toEpochMilli(),
                to.toEpochMilli()
        );

        return admittedCount == null ? 0L : admittedCount;
    }

    /**
     * 사용자의 명시적 이탈을 반영합니다.
     */
    public void leave(QueueStatusSnapshot snapshot) {
        removeFromActiveSet(snapshot);
        deleteAdmitToken(snapshot.admitToken());
        stringRedisTemplate.opsForHash().putAll(
                statusKey(snapshot.queueToken()),
                queueStatusHashMapper.toTerminalStatusFields(QueueRequestStatus.LEFT)
        );
        stringRedisTemplate.expire(statusKey(snapshot.queueToken()), QueueConstants.TERMINAL_STATUS_TTL);
    }

    /**
     * 상태별 TTL이 지난 사용자를 자동 정리합니다.
     */
    public void expire(QueueStatusSnapshot snapshot) {
        removeFromActiveSet(snapshot);
        deleteAdmitToken(snapshot.admitToken());
        stringRedisTemplate.opsForHash().putAll(
                statusKey(snapshot.queueToken()),
                queueStatusHashMapper.toTerminalStatusFields(QueueRequestStatus.EXPIRED)
        );
        stringRedisTemplate.expire(statusKey(snapshot.queueToken()), QueueConstants.TERMINAL_STATUS_TTL);
    }

    private String statusKey(String queueToken) {
        return QueueConstants.STATUS_KEY_PREFIX + queueToken;
    }

    private String waitingKey(QueueScope scope, Long sessionId) {
        return QueueConstants.WAITING_KEY_PREFIX + scope.name() + ":" + sessionId;
    }

    private String admittedKey(QueueScope scope, Long sessionId) {
        return QueueConstants.ADMITTED_KEY_PREFIX + scope.name() + ":" + sessionId;
    }

    private String admissionHistoryKey(QueueScope scope, Long sessionId) {
        return QueueConstants.ADMISSION_HISTORY_KEY_PREFIX + scope.name() + ":" + sessionId;
    }

    private String admitTokenKey(String admitToken) {
        return QueueConstants.ADMIT_TOKEN_KEY_PREFIX + admitToken;
    }

    private void removeFromActiveSet(QueueStatusSnapshot snapshot) {
        if (snapshot.status() == QueueRequestStatus.WAITING) {
            stringRedisTemplate.opsForZSet().remove(waitingKey(snapshot.scope(), snapshot.sessionId()), snapshot.queueToken());
            return;
        }

        if (snapshot.status() == QueueRequestStatus.ADMITTED) {
            stringRedisTemplate.opsForZSet().remove(admittedKey(snapshot.scope(), snapshot.sessionId()), snapshot.queueToken());
        }
    }

    private Optional<QueueTarget> parseTarget(String key, String prefix) {
        String raw = key.substring(prefix.length());
        String[] parts = raw.split(":");
        if (parts.length == 1) {
            return Optional.of(new QueueTarget(QueueScope.BOOKING, Long.parseLong(parts[0])));
        }

        return Optional.of(new QueueTarget(QueueScope.valueOf(parts[0]), Long.parseLong(parts[1])));
    }

    private void deleteAdmitToken(String admitToken) {
        if (admitToken != null && !admitToken.isBlank()) {
            stringRedisTemplate.delete(admitTokenKey(admitToken));
        }
    }
}
