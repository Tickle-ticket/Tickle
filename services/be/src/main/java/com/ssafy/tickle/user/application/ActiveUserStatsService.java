package com.ssafy.tickle.user.application;

import com.ssafy.tickle.user.presentation.dto.ActiveUserStatsResponse;
import com.ssafy.tickle.user.presentation.interceptor.UserAccessLogInterceptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 실시간 일반 사용자(USER 권한) 접속 통계를 제공하는 서비스입니다.
 *
 * <p>데이터는 Redis ZSet({@code active_users_zset})에서 조회합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ActiveUserStatsService {

    private final StringRedisTemplate redisTemplate;

    /** 30분(초) — 이 시간 내 활동이 없으면 비활성으로 간주 */
    private static final long ACTIVE_WINDOW_SECONDS = 30 * 60L;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * 오늘 기준 실시간 접속 통계를 반환합니다.
     *
     * @return 현재/피크/평균 접속자 수
     */
    public ActiveUserStatsResponse getStats() {
        long current = getCurrentCount();
        long peak = getPeakCount();
        long average = getAverageCount();
        return new ActiveUserStatsResponse(current, peak, average);
    }

    /**
     * 현재 활성 접속자 수를 반환합니다.
     *
     * <p>최근 30분 이내에 API 요청을 보낸 USER 권한 사용자 수입니다.</p>
     */
    public long getCurrentCount() {
        long now = Instant.now().getEpochSecond();
        long windowStart = now - ACTIVE_WINDOW_SECONDS;
        try {
            Long count = redisTemplate.opsForZSet().count(
                    UserAccessLogInterceptor.ACTIVE_USERS_ZSET_KEY,
                    windowStart, now
            );
            return count != null ? count : 0L;
        } catch (Exception e) {
            log.warn("실시간 접속자 수 조회 실패: {}", e.getMessage());
            return 0L;
        }
    }

    /**
     * 오늘의 피크 접속자 수를 반환합니다.
     *
     * <p>5분 주기 스케줄러가 기록한 {@code peak_active_users:{today}} 키에서 조회합니다.</p>
     */
    public long getPeakCount() {
        String key = buildPeakKey();
        try {
            String value = redisTemplate.opsForValue().get(key);
            return value != null ? Long.parseLong(value) : 0L;
        } catch (Exception e) {
            log.warn("피크 접속자 수 조회 실패: {}", e.getMessage());
            return 0L;
        }
    }

    /**
     * 오늘의 평균 접속자 수를 반환합니다.
     *
     * <p>5분 주기 스케줄러가 쌓은 스냅샷 합계 ÷ 스냅샷 횟수로 계산합니다.</p>
     */
    public long getAverageCount() {
        String sumKey = buildSnapshotSumKey();
        String countKey = buildSnapshotCountKey();
        try {
            String sumStr = redisTemplate.opsForValue().get(sumKey);
            String countStr = redisTemplate.opsForValue().get(countKey);
            if (sumStr == null || countStr == null) {
                return 0L;
            }
            long sum = Long.parseLong(sumStr);
            long count = Long.parseLong(countStr);
            return count > 0 ? sum / count : 0L;
        } catch (Exception e) {
            log.warn("평균 접속자 수 조회 실패: {}", e.getMessage());
            return 0L;
        }
    }

    public static String buildPeakKey() {
        String today = ZonedDateTime.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        return "peak_active_users:" + today;
    }

    public static String buildSnapshotSumKey() {
        String today = ZonedDateTime.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        return "active_snapshot_sum:" + today;
    }

    public static String buildSnapshotCountKey() {
        String today = ZonedDateTime.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        return "active_snapshot_count:" + today;
    }
}
