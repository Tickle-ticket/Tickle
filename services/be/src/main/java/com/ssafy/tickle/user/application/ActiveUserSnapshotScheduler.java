package com.ssafy.tickle.user.application;

import com.ssafy.tickle.user.presentation.interceptor.UserAccessLogInterceptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * 5분마다 실시간 접속자 수를 스냅샷하여 피크 및 평균 계산을 위해 Redis에 적재하는 스케줄러입니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ActiveUserSnapshotScheduler {

    private final StringRedisTemplate redisTemplate;
    private final ActiveUserStatsService activeUserStatsService;

    private static final long ACTIVE_WINDOW_SECONDS = 30 * 60L;
    /** 통계 키 TTL — 3일간 보관 */
    private static final Duration STATS_TTL = Duration.ofDays(3);

    /**
     * 5분마다 현재 활성 접속자 수를 스냅샷합니다.
     *
     * <ul>
     *   <li>피크({@code peak_active_users:{today}}): 오늘 중 최대값으로 갱신</li>
     *   <li>합계({@code active_snapshot_sum:{today}}): 누적 합산</li>
     *   <li>횟수({@code active_snapshot_count:{today}}): 스냅샷 횟수 카운트</li>
     * </ul>
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    public void snapshotActiveUsers() {
        try {
            long now = Instant.now().getEpochSecond();
            long windowStart = now - ACTIVE_WINDOW_SECONDS;

            Long current = redisTemplate.opsForZSet().count(
                    UserAccessLogInterceptor.ACTIVE_USERS_ZSET_KEY,
                    windowStart, now
            );
            long currentCount = current != null ? current : 0L;

            String peakKey = ActiveUserStatsService.buildPeakKey();
            String sumKey = ActiveUserStatsService.buildSnapshotSumKey();
            String countKey = ActiveUserStatsService.buildSnapshotCountKey();

            // 피크 갱신: 현재 값이 저장된 피크보다 크면 교체
            String peakStr = redisTemplate.opsForValue().get(peakKey);
            long storedPeak = peakStr != null ? Long.parseLong(peakStr) : 0L;
            if (currentCount > storedPeak) {
                redisTemplate.opsForValue().set(peakKey, String.valueOf(currentCount), STATS_TTL);
            }

            // 평균 계산을 위한 합계와 횟수 누적
            redisTemplate.opsForValue().increment(sumKey, currentCount);
            redisTemplate.opsForValue().increment(countKey, 1);

            // TTL 보정 (increment는 기존 TTL을 유지하지 않으므로 명시적으로 설정)
            redisTemplate.expire(sumKey, STATS_TTL);
            redisTemplate.expire(countKey, STATS_TTL);

            log.debug("접속자 스냅샷 완료 — 현재: {}, 피크: {}", currentCount, Math.max(currentCount, storedPeak));
        } catch (Exception e) {
            log.error("접속자 스냅샷 스케줄러 오류: {}", e.getMessage());
        }
    }
}
