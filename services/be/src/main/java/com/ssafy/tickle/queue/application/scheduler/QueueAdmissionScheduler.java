package com.ssafy.tickle.queue.application.scheduler;

import com.ssafy.tickle.common.util.RedisLockManager;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueStatusStore;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * waiting 상위 사용자를 주기적으로 ADMITTED 상태로 전이합니다.
 */
@Component
@RequiredArgsConstructor
public class QueueAdmissionScheduler {

    private final QueueStatusStore queueStatusStore;
    private final QueueStatusService queueStatusService;
    private final RedisLockManager redisLockManager;

    /**
     * 회차별 available slot만큼 waiting 상위 사용자를 admission 처리합니다.
     */
    @Scheduled(fixedDelay = 1000L)
    public void admitWaitingUsers() {
        Instant admittedAt = Instant.now();

        for (Long sessionId : queueStatusStore.findWaitingSessionIds()) {
            // scheduler는 다음 주기에 다시 돌기 때문에, 락 경쟁 시 대기하지 않고 바로 건너뛴다.
            if (!redisLockManager.tryLock(admissionLockKey(sessionId))) {
                continue;
            }

            try {
                // slot 계산부터 admitToken 발급과 상태 전이 완료까지는 같은 sessionId 락 안에서 처리한다.
                Long admittedCount = queueStatusStore.countAdmitted(sessionId);
                Long availableSlots = queueStatusService.slotLimit() - admittedCount;
                if (availableSlots <= 0) {
                    continue;
                }

                queueStatusStore.admitWaitingUsers(sessionId, availableSlots, admittedAt);
            } finally {
                redisLockManager.unlock(admissionLockKey(sessionId));
            }
        }
    }

    private String admissionLockKey(Long sessionId) {
        return QueueConstants.ADMISSION_LOCK_KEY_PREFIX + sessionId;
    }
}
