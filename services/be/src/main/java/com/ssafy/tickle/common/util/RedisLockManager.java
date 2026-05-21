package com.ssafy.tickle.common.util;

import lombok.RequiredArgsConstructor;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Redisson 기반 분산 락 유틸입니다.
 */
@Component
@RequiredArgsConstructor
public class RedisLockManager {

    private final RedissonClient redissonClient;

    /**
     * 최대 {@code waitMillis}ms 동안 락 획득을 시도합니다.
     *
     * <p>waitTime=0이면 이미 락이 잡혀 있을 때 즉시 false를 반환해, 동시 선점 요청의
     * 대부분이 실패하게 됩니다. waitTime을 짧게 주면 직전 요청이 락을 해제하는 순간
     * 다음 요청이 즉시 획득할 수 있어 UX가 크게 개선됩니다.</p>
     *
     * @param lockKey   락 식별 키
     * @param waitMillis 최대 대기 시간 (밀리초)
     * @return 락 획득 성공 여부
     */
    public boolean tryLock(String lockKey, long waitMillis) {
        RLock lock = redissonClient.getLock(lockKey);
        try {
            // leaseTime=10s: 비정상 종료 시 10초 후 자동 해제 (watchdog 대신 명시적 TTL)
            return lock.tryLock(waitMillis, 10_000L, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /**
     * 락 획득을 즉시 시도합니다 (waitTime=0).
     *
     * <p>대기열 입장 스케줄러처럼 "이번 주기 실패 → 다음 주기 재시도"가 자연스러운 경우에 사용합니다.
     * 좌석 선점처럼 사용자가 직접 기다리는 경우에는 {@link #tryLock(String, long)}을 사용하세요.</p>
     */
    public boolean tryLock(String lockKey) {
        RLock lock = redissonClient.getLock(lockKey);
        return lock.tryLock();
    }

    /**
     * 현재 스레드가 락을 소유한 경우에만 안전하게 해제합니다.
     */
    public void unlock(String lockKey) {
        RLock lock = redissonClient.getLock(lockKey);
        if (lock.isHeldByCurrentThread()) {
            lock.unlock();
        }
    }
}
