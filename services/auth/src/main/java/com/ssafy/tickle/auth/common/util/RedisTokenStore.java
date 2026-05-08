package com.ssafy.tickle.auth.common.util;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * Redis 기반 토큰 저장소입니다.
 *
 * <p>Refresh Token 저장/조회/삭제와 Access Token 블랙리스트 관리를 담당한다.</p>
 */
@Component
@RequiredArgsConstructor
public class RedisTokenStore {

    private static final String REFRESH_KEY_PREFIX = "refresh:";
    private static final String BLACKLIST_KEY_PREFIX = "blacklist:";

    private final StringRedisTemplate stringRedisTemplate;

    /**
     * Refresh Token을 저장합니다.
     *
     * @param userId        사용자 식별자
     * @param refreshToken  저장할 Refresh Token
     * @param expirySeconds 만료 시간(초)
     */
    public void saveRefreshToken(Long userId, String refreshToken, long expirySeconds) {
        stringRedisTemplate.opsForValue().set(
                REFRESH_KEY_PREFIX + userId,
                refreshToken,
                Duration.ofSeconds(expirySeconds)
        );
    }

    /**
     * 저장된 Refresh Token을 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return Refresh Token (없으면 Optional.empty)
     */
    public Optional<String> findRefreshToken(Long userId) {
        return Optional.ofNullable(
                stringRedisTemplate.opsForValue().get(REFRESH_KEY_PREFIX + userId)
        );
    }

    /**
     * Refresh Token을 삭제합니다 (로그아웃 시 호출).
     *
     * @param userId 사용자 식별자
     */
    public void deleteRefreshToken(Long userId) {
        stringRedisTemplate.delete(REFRESH_KEY_PREFIX + userId);
    }

    /**
     * Access Token을 블랙리스트에 등록합니다 (로그아웃 시 호출).
     * TTL을 토큰 남은 만료 시간으로 설정해 자동 삭제되도록 한다.
     *
     * @param accessToken          블랙리스트에 등록할 Access Token
     * @param remainingExpirySeconds 토큰의 남은 유효 시간(초)
     */
    public void blacklistAccessToken(String accessToken, long remainingExpirySeconds) {
        if (remainingExpirySeconds <= 0) {
            return;
        }
        stringRedisTemplate.opsForValue().set(
                BLACKLIST_KEY_PREFIX + accessToken,
                "1",
                Duration.ofSeconds(remainingExpirySeconds)
        );
    }

    /**
     * Access Token이 블랙리스트에 등록되어 있는지 확인합니다.
     *
     * @param accessToken 확인할 Access Token
     * @return 블랙리스트 등록 여부
     */
    public boolean isBlacklisted(String accessToken) {
        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(BLACKLIST_KEY_PREFIX + accessToken));
    }
}
