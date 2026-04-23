package com.ssafy.tickle.queue.application.scheduler;

import com.ssafy.tickle.queue.application.QueueStatusService;
import com.ssafy.tickle.queue.domain.QueueRequestStatus;
import com.ssafy.tickle.queue.infrastructure.cache.QueueStatusStore;
import com.ssafy.tickle.queue.infrastructure.cache.model.QueueStatusSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * 상태별 TTL이 지난 사용자를 주기적으로 정리합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueStatusCleanupScheduler {

    private final QueueStatusStore queueStatusStore;
    private final QueueStatusService queueStatusService;

    @Scheduled(fixedDelay = 10_000L)
    public void cleanupWaitingUsers() {
        Instant now = Instant.now();

        for (Long sessionId : queueStatusStore.findWaitingSessionIds()) {
            for (String queueToken : queueStatusStore.findWaitingQueueTokens(sessionId)) {
                QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken).orElse(null);
                if (snapshot == null) {
                    queueStatusStore.removeWaitingQueueToken(sessionId, queueToken);
                    continue;
                }

                if (snapshot.status() != QueueRequestStatus.WAITING) {
                    continue;
                }

                if (isQueueTokenExpired(snapshot, now)) {
                    queueStatusService.expire(queueToken);
                }
            }
        }
    }

    @Scheduled(fixedDelay = 10_000L)
    public void cleanupAdmittedUsers() {
        Instant now = Instant.now();

        for (Long sessionId : queueStatusStore.findAdmittedSessionIds()) {
            for (String queueToken : queueStatusStore.findAdmittedQueueTokens(sessionId)) {
                QueueStatusSnapshot snapshot = queueStatusStore.findSnapshot(queueToken).orElse(null);
                if (snapshot == null) {
                    queueStatusStore.removeAdmittedQueueToken(sessionId, queueToken);
                    continue;
                }

                if (snapshot.status() != QueueRequestStatus.ADMITTED) {
                    continue;
                }

                if (isAdmitTokenExpired(snapshot, now)) {
                    queueStatusService.expire(queueToken);
                }
            }
        }
    }

    private boolean isQueueTokenExpired(QueueStatusSnapshot snapshot, Instant now) {
        return snapshot.registeredAt().plus(queueStatusService.queueTokenTtl()).isBefore(now);
    }

    private boolean isAdmitTokenExpired(QueueStatusSnapshot snapshot, Instant now) {
        return snapshot.admittedAt() == null
                || snapshot.admittedAt().plus(queueStatusService.admitTokenTtl()).isBefore(now);
    }
}
