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
     * @param eventId 공연 식별자
     * @param registeredAt 대기열 등록 시각
     */
    public void registerWaitingIfAbsent(
            String queueToken,
            String requestId,
            Long userId,
            Long eventId,
            Instant registeredAt
    ) {
        registerWaitingIfAbsent(queueToken, requestId, userId, QueueScope.BOOKING, eventId, registeredAt);
    }

    public void registerWaitingIfAbsent(
            String queueToken,
            String requestId,
            Long userId,
            QueueScope scope,
            Long eventId,
            Instant registeredAt
    ) {
        String statusKey = statusKey(queueToken);
        if (Boolean.TRUE.equals(stringRedisTemplate.hasKey(statusKey))) {
            return;
        }

        // 개별 사용자 상태를 조회할 때 사용
        stringRedisTemplate.opsForHash().putAll(
                statusKey,
                queueStatusHashMapper.toHash(requestId, userId, scope, eventId, QueueRequestStatus.WAITING, registeredAt)
        );
        stringRedisTemplate.expire(statusKey, QueueConstants.QUEUE_TOKEN_TTL);

        // 해당 공연에서 현재 순번을 계산할 때 사용
        stringRedisTemplate.opsForZSet().add(waitingKey(scope, eventId), queueToken, registeredAt.toEpochMilli());
        // KEYS * 없이 active event 목록을 추적하기 위해 별도 Set에 등록한다.
        stringRedisTemplate.opsForSet().add(QueueConstants.WAITING_EVENTS_KEY, toEventKey(scope, eventId));
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
     * @param eventId 공연 식별자
     * @param queueToken 대기열 토큰
     * @return 1-based 순번
     */
    public Long findRank(Long eventId, String queueToken) {
        return findRank(QueueScope.BOOKING, eventId, queueToken);
    }

    public Long findRank(QueueScope scope, Long eventId, String queueToken) {
        Long rank = stringRedisTemplate.opsForZSet().rank(waitingKey(scope, eventId), queueToken);
        return rank == null ? null : rank + 1;
    }

    /**
     * 현재 waiting 인원 수를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return waiting 인원 수
     */
    public long countWaiting(Long eventId) {
        return countWaiting(QueueScope.BOOKING, eventId);
    }

    public long countWaiting(QueueScope scope, Long eventId) {
        Long waitingCount = stringRedisTemplate.opsForZSet().zCard(waitingKey(scope, eventId));
        return waitingCount == null ? 0L : waitingCount;
    }

    /**
     * 현재 입장 허용된 인원 수를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 입장 허용 인원 수
     */
    public long countAdmitted(Long eventId) {
        return countAdmitted(QueueScope.BOOKING, eventId);
    }

    public long countAdmitted(QueueScope scope, Long eventId) {
        Long admittedCount = stringRedisTemplate.opsForZSet().zCard(admittedKey(scope, eventId));
        return admittedCount == null ? 0L : admittedCount;
    }

    /**
     * 현재 ADMITTED 사용자가 존재하는 공연 목록을 조회합니다.
     */
    public Set<QueueTarget> findAdmittedTargets() {
        Set<String> eventKeys = stringRedisTemplate.opsForSet().members(QueueConstants.ADMITTED_EVENTS_KEY);
        if (eventKeys == null || eventKeys.isEmpty()) {
            return Set.of();
        }

        Set<QueueTarget> targets = new java.util.HashSet<>();
        for (String key : eventKeys) {
            parseEventKey(key).ifPresent(target -> {
                if (countAdmitted(target.scope(), target.eventId()) > 0) {
                    targets.add(target);
                } else {
                    // admitted ZSet이 비어 있으면 stale 항목 제거
                    stringRedisTemplate.opsForSet().remove(QueueConstants.ADMITTED_EVENTS_KEY, key);
                }
            });
        }
        return targets;
    }

    public Set<Long> findAdmittedEventIds() {
        Set<Long> eventIds = new java.util.HashSet<>();
        for (QueueTarget target : findAdmittedTargets()) {
            if (target.scope() == QueueScope.BOOKING) {
                eventIds.add(target.eventId());
            }
        }
        return eventIds;
    }

    public Set<String> findWaitingQueueTokens(Long eventId) {
        return findWaitingQueueTokens(QueueScope.BOOKING, eventId);
    }

    public Set<String> findWaitingQueueTokens(QueueScope scope, Long eventId) {
        Set<String> queueTokens = stringRedisTemplate.opsForZSet().range(waitingKey(scope, eventId), 0, -1);
        return queueTokens == null ? Set.of() : queueTokens;
    }

    public Set<String> findAdmittedQueueTokens(Long eventId) {
        return findAdmittedQueueTokens(QueueScope.BOOKING, eventId);
    }

    public Set<String> findAdmittedQueueTokens(QueueScope scope, Long eventId) {
        Set<String> queueTokens = stringRedisTemplate.opsForZSet().range(admittedKey(scope, eventId), 0, -1);
        return queueTokens == null ? Set.of() : queueTokens;
    }

    public void removeWaitingQueueToken(Long eventId, String queueToken) {
        removeWaitingQueueToken(QueueScope.BOOKING, eventId, queueToken);
    }

    public void removeWaitingQueueToken(QueueScope scope, Long eventId, String queueToken) {
        stringRedisTemplate.opsForZSet().remove(waitingKey(scope, eventId), queueToken);
    }

    public void removeAdmittedQueueToken(Long eventId, String queueToken) {
        removeAdmittedQueueToken(QueueScope.BOOKING, eventId, queueToken);
    }

    public void removeAdmittedQueueToken(QueueScope scope, Long eventId, String queueToken) {
        stringRedisTemplate.opsForZSet().remove(admittedKey(scope, eventId), queueToken);
    }

    /**
     * waiting 상태 사용자 중 상위 N명을 ADMITTED 상태로 전이합니다.
     *
     * @param eventId 공연 식별자
     * @param limit 입장시킬 최대 인원 수
     * @param admittedAt 입장 처리 시각
     */
    public void admitWaitingUsers(Long eventId, long limit, Instant admittedAt) {
        admitWaitingUsers(QueueScope.BOOKING, eventId, limit, admittedAt);
    }

    public void admitWaitingUsers(QueueScope scope, Long eventId, long limit, Instant admittedAt) {
        if (limit <= 0) {
            return;
        }

        Set<String> queueTokens = stringRedisTemplate.opsForZSet().range(waitingKey(scope, eventId), 0, limit - 1);
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
            stringRedisTemplate.opsForZSet().remove(waitingKey(scope, eventId), queueToken);
            stringRedisTemplate.opsForZSet().add(admittedKey(scope, eventId), queueToken, admittedAt.toEpochMilli());
            stringRedisTemplate.opsForZSet().add(admissionHistoryKey(scope, eventId), queueToken, admittedAt.toEpochMilli());
            // KEYS * 없이 admitted event 목록을 추적하기 위해 별도 Set에 등록한다.
            stringRedisTemplate.opsForSet().add(QueueConstants.ADMITTED_EVENTS_KEY, toEventKey(scope, eventId));
        }
    }

    /**
     * waiting 사용자가 존재하는 공연 목록을 조회합니다.
     */
    public Set<QueueTarget> findWaitingTargets() {
        Set<String> eventKeys = stringRedisTemplate.opsForSet().members(QueueConstants.WAITING_EVENTS_KEY);
        if (eventKeys == null || eventKeys.isEmpty()) {
            return Set.of();
        }

        Set<QueueTarget> targets = new java.util.HashSet<>();
        for (String key : eventKeys) {
            parseEventKey(key).ifPresent(target -> {
                if (countWaiting(target.scope(), target.eventId()) > 0) {
                    targets.add(target);
                } else {
                    // waiting ZSet이 비어 있으면 stale 항목 제거
                    stringRedisTemplate.opsForSet().remove(QueueConstants.WAITING_EVENTS_KEY, key);
                }
            });
        }
        return targets;
    }

    public Set<Long> findWaitingEventIds() {
        Set<Long> eventIds = new java.util.HashSet<>();
        for (QueueTarget target : findWaitingTargets()) {
            if (target.scope() == QueueScope.BOOKING) {
                eventIds.add(target.eventId());
            }
        }
        return eventIds;
    }

    /**
     * 최근 admission 처리량 계산용 기록 수를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @param from 시작 시각
     * @param to 종료 시각
     * @return 최근 admission 수
     */
    public long countRecentAdmissions(Long eventId, Instant from, Instant to) {
        return countRecentAdmissions(QueueScope.BOOKING, eventId, from, to);
    }

    public long countRecentAdmissions(QueueScope scope, Long eventId, Instant from, Instant to) {
        Long admittedCount = stringRedisTemplate.opsForZSet().count(
                admissionHistoryKey(scope, eventId),
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

    private String waitingKey(QueueScope scope, Long eventId) {
        return QueueConstants.WAITING_KEY_PREFIX + scope.name() + ":" + eventId;
    }

    private String admittedKey(QueueScope scope, Long eventId) {
        return QueueConstants.ADMITTED_KEY_PREFIX + scope.name() + ":" + eventId;
    }

    private String admissionHistoryKey(QueueScope scope, Long eventId) {
        return QueueConstants.ADMISSION_HISTORY_KEY_PREFIX + scope.name() + ":" + eventId;
    }

    private String admitTokenKey(String admitToken) {
        return QueueConstants.ADMIT_TOKEN_KEY_PREFIX + admitToken;
    }

    private void removeFromActiveSet(QueueStatusSnapshot snapshot) {
        if (snapshot.status() == QueueRequestStatus.WAITING) {
            stringRedisTemplate.opsForZSet().remove(waitingKey(snapshot.scope(), snapshot.eventId()), snapshot.queueToken());
            return;
        }

        if (snapshot.status() == QueueRequestStatus.ADMITTED) {
            stringRedisTemplate.opsForZSet().remove(admittedKey(snapshot.scope(), snapshot.eventId()), snapshot.queueToken());
        }
    }

    private String toEventKey(QueueScope scope, Long eventId) {
        return scope.name() + ":" + eventId;
    }

    private Optional<QueueTarget> parseEventKey(String key) {
        String[] parts = key.split(":");
        try {
            if (parts.length == 1) {
                return Optional.of(new QueueTarget(QueueScope.BOOKING, Long.parseLong(parts[0])));
            }
            return Optional.of(new QueueTarget(QueueScope.valueOf(parts[0]), Long.parseLong(parts[1])));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private void deleteAdmitToken(String admitToken) {
        if (admitToken != null && !admitToken.isBlank()) {
            stringRedisTemplate.delete(admitTokenKey(admitToken));
        }
    }
}
