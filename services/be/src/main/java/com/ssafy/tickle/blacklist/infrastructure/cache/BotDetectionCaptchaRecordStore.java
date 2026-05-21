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

    /**
     * CAPTCHA 추가 검증 대상 recordId를 사용자 단위 pending key로 저장합니다.
     *
     * @param userId   CAPTCHA 재검증 대상 사용자 식별자
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     * @return Redis 저장 성공 여부
     */
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

    /**
     * 사용자와 recordId 조합의 pending key가 존재하는지 확인합니다.
     *
     * @param userId   CAPTCHA 검증 요청 사용자 식별자
     * @param recordId FE가 SSE에서 전달받아 검증 요청에 포함한 recordId
     * @return pending key 존재 여부
     */
    public boolean exists(Long userId, String recordId) {
        String key = key(userId, recordId);
        try {
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
        } catch (DataAccessException exception) {
            log.warn("봇 탐지 CAPTCHA recordId 조회에 실패했습니다. userId={}, recordId={}", userId, recordId, exception);
            return false;
        }
    }

    /**
     * CAPTCHA 추가 검증이 끝난 pending key를 삭제합니다.
     *
     * @param userId   CAPTCHA 검증 요청 사용자 식별자
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     */
    public void delete(Long userId, String recordId) {
        String key = key(userId, recordId);
        try {
            stringRedisTemplate.delete(key);
        } catch (DataAccessException exception) {
            log.warn("봇 탐지 CAPTCHA recordId 삭제에 실패했습니다. userId={}, recordId={}", userId, recordId, exception);
        }
    }

    /**
     * 다른 사용자의 recordId 재사용을 막기 위해 userId와 recordId를 함께 key로 구성합니다.
     *
     * @param userId   사용자 식별자
     * @param recordId AI 서버의 1차 봇 판별 결과 식별자
     * @return Redis key
     */
    private String key(Long userId, String recordId) {
        return KEY_PREFIX + userId + ":" + recordId;
    }
}
