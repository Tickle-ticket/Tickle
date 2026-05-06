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
 * IP별 요청 횟수를 추적하여 과도한 요청을 보내는 사용자를 블랙리스트에 등록하는 인터셉터입니다.
 *
 * <p>10초 슬라이딩 윈도우 내에 동일 IP에서 10회를 초과하는 요청이 발생하면
 * userId를 블랙리스트에 등록합니다. userId가 있으면 "rate:user:{userId}:{ip}" 키를,
 * 없으면 "rate:ip:{ip}" 키를 사용합니다. 요청 자체는 차단하지 않으며,
 * 이후 요청에서 {@link BlacklistInterceptor}가 차단을 담당합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IpRateLimitInterceptor implements HandlerInterceptor {

    private static final String RATE_KEY_PREFIX = "rate:ip:";
    private static final String USER_RATE_KEY_PREFIX = "rate:user:";
    private static final long WINDOW_SECONDS = 10L;
    private static final long REQUEST_LIMIT = 10L;

    private final StringRedisTemplate stringRedisTemplate;
    private final BlacklistService blacklistService;

    /**
     * IP별(또는 userId+IP 복합) 요청 횟수를 카운트하고, 한도 초과 시 블랙리스트에 등록합니다.
     *
     * @param request  HTTP 요청
     * @param response HTTP 응답
     * @param handler  핸들러
     * @return 항상 true (요청 자체는 차단하지 않음)
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String ip = resolveClientIp(request);
        String userIdStr = request.getParameter("userId");

        String key;
        if (userIdStr != null && !userIdStr.isBlank()) {
            key = USER_RATE_KEY_PREFIX + userIdStr + ":" + ip;
        } else {
            key = RATE_KEY_PREFIX + ip;
        }

        try {
            Long count = stringRedisTemplate.opsForValue().increment(key);
            if (count == null) return true;

            if (count == 1L) {
                stringRedisTemplate.expire(key, WINDOW_SECONDS, TimeUnit.SECONDS);
            }

            if (count > REQUEST_LIMIT) {
                log.warn("IP 속도 제한 초과: ip={}, count={}", ip, count);
                if (userIdStr != null && !userIdStr.isBlank()) {
                    try {
                        Long userId = Long.parseLong(userIdStr);
                        blacklistService.addBlacklistInternal(new InternalAddBlacklistRequest(
                                userId,
                                "IP_RATE_LIMIT",
                                "10초 내 " + count + "회 요청 (IP: " + ip + ")",
                                ip
                        ));
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        } catch (org.springframework.dao.DataAccessException e) {
            log.warn("IP Rate Limit 체크 중 Redis 오류 발생, 탐지 생략: ip={}", ip, e);
        }

        return true;
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
