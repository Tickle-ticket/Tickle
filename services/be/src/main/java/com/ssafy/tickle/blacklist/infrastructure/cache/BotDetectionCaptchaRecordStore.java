package com.ssafy.tickle.blacklist.infrastructure.cache;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * CAPTCHA 추가 검증 대상 AI 판별 recordId를 Redis에 저장합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BotDetectionCaptchaRecordStore {

    private static final String KEY_PREFIX = "bot-detection:captcha-record:";
    private static final Duration TTL = Duration.ofMinutes(10);
    private static final String PENDING_VALUE = "PENDING";

    private final StringRedisTemplate stringRedisTemplate;

    public boolean save(Long userId, String recordId) {
        String key = key(userId, recordId);
        try {
            stringRedisTemplate.opsForValue().set(key, PENDING_VALUE, TTL);
            return true;
        } catch (DataAccessException exception) {
            log.warn("봇 탐지 CAPTCHA recordId 저장에 실패했습니다. userId={}, recordId={}", userId, recordId, exception);
            return false;
        }
    }

    public boolean exists(Long userId, String recordId) {
        String key = key(userId, recordId);
        try {
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
        } catch (DataAccessException exception) {
            log.warn("봇 탐지 CAPTCHA recordId 조회에 실패했습니다. userId={}, recordId={}", userId, recordId, exception);
            return false;
        }
    }

    public void delete(Long userId, String recordId) {
        String key = key(userId, recordId);
        try {
            stringRedisTemplate.delete(key);
        } catch (DataAccessException exception) {
            log.warn("봇 탐지 CAPTCHA recordId 삭제에 실패했습니다. userId={}, recordId={}", userId, recordId, exception);
        }
    }

    private String key(Long userId, String recordId) {
        return KEY_PREFIX + userId + ":" + recordId;
    }
}
