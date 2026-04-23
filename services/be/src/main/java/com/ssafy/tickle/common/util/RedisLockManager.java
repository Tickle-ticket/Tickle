package com.ssafy.tickle.common.util;

import lombok.RequiredArgsConstructor;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

/**
 * Redisson 기반 분산 락 유틸입니다.
 */
@Component
@RequiredArgsConstructor
public class RedisLockManager {

    private final RedissonClient redissonClient;

    /**
     * 즉시 락 획득만 시도하고, 성공 시 watchdog이 unlock 전까지 lease를 자동 연장합니다.
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
