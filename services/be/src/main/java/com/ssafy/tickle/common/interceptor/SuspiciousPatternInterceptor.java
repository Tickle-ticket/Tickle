package com.ssafy.tickle.common.interceptor;

import com.ssafy.tickle.blacklist.application.BlacklistService;
import com.ssafy.tickle.blacklist.presentation.dto.InternalAddBlacklistRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    /**
     * 의심스러운 접근 패턴을 검사하고, 탐지 시 블랙리스트에 등록합니다.
     *
     * @param request  HTTP 요청
     * @param response HTTP 응답
     * @param handler  핸들러
     * @return 항상 true (요청 자체는 차단하지 않음)
     */
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

        detectMultiIp(userId, ip);
        detectHoldReleaseRepeat(userId, request);

        return true;
    }

    /**
     * 동일 사용자가 여러 IP에서 동시 접근하는 패턴을 탐지합니다.
     *
     * @param userId 사용자 식별자
     * @param ip     클라이언트 IP 주소
     */
    private void detectMultiIp(Long userId, String ip) {
        String key = MULTI_IP_KEY_PREFIX + userId;

        // 키가 존재하지 않을 때만 TTL 설정 (첫 번째 IP 추가 시)
        Boolean isNew = stringRedisTemplate.opsForSet().add(key, ip) != null
                && !stringRedisTemplate.hasKey(key + ":ttl-set");
        Long size = stringRedisTemplate.opsForSet().size(key);

        // 첫 IP 추가 여부를 별도로 판단하기 위해 size==1 체크 사용
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

    /**
     * 좌석 선점 해제(DELETE /seats/hold)를 반복적으로 수행하는 패턴을 탐지합니다.
     *
     * @param userId  사용자 식별자
     * @param request HTTP 요청
     */
    private void detectHoldReleaseRepeat(Long userId, HttpServletRequest request) {
        if (!"DELETE".equalsIgnoreCase(request.getMethod())
                || !request.getRequestURI().contains("/seats/hold")) {
            return;
        }

        String key = HOLD_RELEASE_KEY_PREFIX + userId;

        Long count = stringRedisTemplate.opsForValue().increment(key);
        if (count == null) {
            return;
        }

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

    /**
     * X-Real-IP 헤더를 우선 확인하고, 없으면 remoteAddr을 사용합니다.
     *
     * @param request HTTP 요청
     * @return 클라이언트 IP 주소
     */
    private String resolveClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank()) {
            return ip;
        }
        return request.getRemoteAddr();
    }
}
