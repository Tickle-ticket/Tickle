package com.ssafy.tickle.common.interceptor;

import com.ssafy.tickle.blacklist.application.BlacklistService;
import com.ssafy.tickle.blacklist.presentation.dto.InternalAddBlacklistRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.TimeUnit;

/**
 * 의심스러운 사용자 행동 패턴을 탐지하여 블랙리스트에 등록하는 인터셉터입니다.
 *
 * <p>두 가지 패턴을 탐지합니다.</p>
 * <ul>
 *   <li>Multi-IP 탐지: 동일 사용자가 60초 내에 3개를 초과하는 IP에서 접근하는 경우</li>
 *   <li>좌석 선점 해제 반복 탐지: 60초 내에 좌석 선점 해제를 5회 이상 반복하는 경우</li>
 * </ul>
 * <p>Redis 장애 시 탐지를 생략하고 요청을 정상 처리합니다 (graceful degradation).</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SuspiciousPatternInterceptor implements HandlerInterceptor {

    private static final int MULTI_IP_THRESHOLD = 3;
    private static final int HOLD_RELEASE_THRESHOLD = 5;
    private static final long WINDOW_SECONDS = 60L;

    private static final String MULTI_IP_KEY_PREFIX = "suspicious:ips:";
    private static final String HOLD_RELEASE_KEY_PREFIX = "suspicious:hold-release:";

    private final StringRedisTemplate stringRedisTemplate;
    private final BlacklistService blacklistService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String userIdStr = request.getParameter("userId");
        if (userIdStr == null || userIdStr.isBlank()) {
            return true;
        }

        Long userId;
        try {
            userId = Long.parseLong(userIdStr);
        } catch (NumberFormatException e) {
            return true;
        }

        String ip = resolveClientIp(request);

        try {
            detectMultiIp(userId, ip);
            detectHoldReleaseRepeat(userId, request);
        } catch (DataAccessException e) {
            log.warn("패턴 탐지 중 Redis 오류 발생, 탐지 생략: userId={}", userId, e);
        }

        return true;
    }

    private void detectMultiIp(Long userId, String ip) {
        String key = MULTI_IP_KEY_PREFIX + userId;

        stringRedisTemplate.opsForSet().add(key, ip);
        Long size = stringRedisTemplate.opsForSet().size(key);

        if (size != null && size == 1L) {
            stringRedisTemplate.expire(key, WINDOW_SECONDS, TimeUnit.SECONDS);
        }

        if (size != null && size > MULTI_IP_THRESHOLD) {
            blacklistService.addBlacklistInternal(new InternalAddBlacklistRequest(
                    userId,
                    "SUSPICIOUS_PATTERN",
                    userId + "번 유저: " + size + "개 IP 동시 접근"
            ));
            log.warn("Multi-IP 의심 패턴 탐지: userId={}, ipCount={}", userId, size);
        }
    }

    private void detectHoldReleaseRepeat(Long userId, HttpServletRequest request) {
        if (!"DELETE".equalsIgnoreCase(request.getMethod())
                || !request.getRequestURI().contains("/seats/hold")) {
            return;
        }

        String key = HOLD_RELEASE_KEY_PREFIX + userId;
        Long count = stringRedisTemplate.opsForValue().increment(key);
        if (count == null) return;

        if (count == 1L) {
            stringRedisTemplate.expire(key, WINDOW_SECONDS, TimeUnit.SECONDS);
        }

        if (count >= HOLD_RELEASE_THRESHOLD) {
            blacklistService.addBlacklistInternal(new InternalAddBlacklistRequest(
                    userId,
                    "SUSPICIOUS_PATTERN",
                    userId + "번 유저: 60초 내 좌석 선점 해제 " + count + "회 반복"
            ));
            log.warn("좌석 선점 해제 반복 의심 패턴 탐지: userId={}, count={}", userId, count);
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank()) {
            return ip;
        }
        return request.getRemoteAddr();
    }
}
