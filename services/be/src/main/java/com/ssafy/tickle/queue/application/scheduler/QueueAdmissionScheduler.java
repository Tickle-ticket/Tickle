package com.ssafy.tickle.queue.application.scheduler;

import com.ssafy.tickle.common.util.RedisLockManager;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.config.QueueConstants;
import com.ssafy.tickle.queue.domain.QueueTarget;
import com.ssafy.tickle.queue.infrastructure.cache.store.QueueStatusStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Set;

/**
 * waiting 상위 사용자를 주기적으로 ADMITTED 상태로 전이합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QueueAdmissionScheduler {

    private final QueueStatusStore queueStatusStore;
    private final QueueStatusService queueStatusService;
    private final RedisLockManager redisLockManager;

    /**
     * 공연별 available slot만큼 waiting 상위 사용자를 admission 처리합니다.
     */
    @Scheduled(fixedDelay = QueueConstants.SCHEDULER_INTERVAL_MILLIS)
    public void admitWaitingUsers() {
        Instant admittedAt = Instant.now();

        Set<QueueTarget> targets;
        try {
            targets = queueStatusStore.findWaitingTargets();
        } catch (Exception e) {
            log.warn("대기열 입장 스케줄러: waiting 타겟 조회 실패, 다음 주기에 재시도", e);
            return;
        }

        for (QueueTarget target : targets) {
            // scheduler는 다음 주기에 다시 돌기 때문에, 락 경쟁 시 대기하지 않고 바로 건너뛴다.
            if (!redisLockManager.tryLock(admissionLockKey(target))) {
                continue;
            }

            try {
                // slot 계산부터 admitToken 발급과 상태 전이 완료까지는 같은 eventId 락 안에서 처리한다.
                Long admittedCount = queueStatusStore.countAdmitted(target.scope(), target.eventId());
                Long availableSlots = queueStatusService.slotLimit() - admittedCount;
                if (availableSlots <= 0) {
                    continue;
                }

                queueStatusStore.admitWaitingUsers(target.scope(), target.eventId(), availableSlots, admittedAt);
            } catch (Exception e) {
                log.warn("대기열 입장 처리 실패. target={}", target, e);
            } finally {
                redisLockManager.unlock(admissionLockKey(target));
            }
        }
    }

    private String admissionLockKey(QueueTarget target) {
        return QueueConstants.ADMISSION_LOCK_KEY_PREFIX + target.scope().name() + ":" + target.eventId();
    }
}
