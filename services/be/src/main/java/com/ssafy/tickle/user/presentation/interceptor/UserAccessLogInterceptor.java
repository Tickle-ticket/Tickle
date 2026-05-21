package com.ssafy.tickle.user.presentation.interceptor;

import com.ssafy.tickle.common.util.JwtProvider;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.domain.UserAccessLog;
import com.ssafy.tickle.user.domain.UserRole;
import com.ssafy.tickle.user.infrastructure.persistence.UserAccessLogRepository;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 접속 통계 및 보안 감사를 위해 사용자의 API 요청 로그를 적재하는 인터셉터입니다.
 *
 * <p>동일한 사용자(userId)가 동일한 IP로 접근하는 경우, 하루에 한 번만 DB에 적재합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserAccessLogInterceptor implements HandlerInterceptor {

    private final JwtProvider jwtProvider;
    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;
    private final UserAccessLogRepository userAccessLogRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    public static final String ACTIVE_USERS_ZSET_KEY = "active_users_zset";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // OPTIONS 메서드는 무시
        if (org.springframework.http.HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        Long userId;
        UserRole userRole;
        try {
            userId = jwtProvider.extractUserIdFromRequest(request).orElse(null);
            userRole = jwtProvider.extractRoleFromRequest(request).orElse(null);
        } catch (Exception e) {
            // 토큰 만료 등 인증 오류 시에는 로그 적재를 생략 (정상 사용자 아님)
            return true;
        }

        if (userId == null || userRole == null) {
            return true;
        }

        // 일반 사용자(USER)만 실시간 접속자 추적 대상
        if (userRole == UserRole.USER) {
            trackActiveUser(userId);
        }

        String ipAddress = getClientIp(request);
        String today = ZonedDateTime.now(KST).format(DATE_FORMATTER);
        String redisKey = String.format("access_log:%s:%d:%s", today, userId, ipAddress);

        // 오늘 해당 IP로 첫 방문인 경우에만 DB 저장
        Boolean isFirstVisit = redisTemplate.opsForValue().setIfAbsent(redisKey, "1", Duration.ofDays(1));

        if (Boolean.TRUE.equals(isFirstVisit)) {
            try {
                recordAccessLog(request, userId, ipAddress);
            } catch (Exception e) {
                log.error("사용자 접속 로그 적재 중 오류 발생 (userId={}): {}", userId, e.getMessage());
                // 로깅 실패가 실제 API 요청 실패로 이어지지 않도록 예외 무시
            }
        }

        return true; // 무조건 통과 (로깅 목적인 인터셉터)
    }

    /**
     * Redis ZSet에 현재 사용자를 실시간 접속자로 등록합니다.
     *
     * <p>score는 현재 epoch 초, member는 userId 문자열입니다.
     * ZSet은 당일 자정에 만료되도록 TTL을 설정합니다.</p>
     */
    private void trackActiveUser(Long userId) {
        try {
            long nowEpoch = Instant.now().getEpochSecond();
            redisTemplate.opsForZSet().add(ACTIVE_USERS_ZSET_KEY, String.valueOf(userId), nowEpoch);
            // 자정에 키 만료 (UTC 기준으로 다음날 0시)
            ZonedDateTime midnightKst = ZonedDateTime.now(KST).toLocalDate().plusDays(1).atStartOfDay(KST);
            long ttlSeconds = midnightKst.toInstant().getEpochSecond() - nowEpoch;
            redisTemplate.expire(ACTIVE_USERS_ZSET_KEY, Duration.ofSeconds(ttlSeconds));
        } catch (Exception e) {
            log.warn("실시간 접속자 추적 Redis 오류 (userId={}): {}", userId, e.getMessage());
        }
    }

    private void recordAccessLog(HttpServletRequest request, Long userId, String ipAddress) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) {
            userAgent = "UNKNOWN";
        }

        String userAgentHash = hashSha256(userAgent);
        
        // 프론트엔드/CDN 헤더에서 GeoIP 정보 추출 (우선순위: 헤더 -> UNKNOWN)
        String countryIsoCode = getHeaderOrDefault(request, "CF-IPCountry", "KR");
        String countryName = "KR".equals(countryIsoCode) ? "South Korea" : "UNKNOWN";
        String cityName = "UNKNOWN";
        String isp = "UNKNOWN";
        String deviceFingerprintHash = getHeaderOrDefault(request, "X-Device-Fingerprint", userAgentHash);

        User userRef = userRepository.getReferenceById(userId);

        UserAccessLog logEntry = UserAccessLog.builder()
                .user(userRef)
                .deviceFingerprintHash(deviceFingerprintHash)
                .userAgentHash(userAgentHash)
                .ipAddress(ipAddress)
                .countryName(countryName)
                .countryIsoCode(countryIsoCode)
                .cityName(cityName)
                .isp(isp)
                .build();

        userAccessLogRepository.save(logEntry);
    }

    private String getClientIp(HttpServletRequest request) {
        String[] headers = {
                "X-Forwarded-For",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_CLIENT_IP",
                "HTTP_X_FORWARDED_FOR"
        };
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // 여러 프록시를 거친 경우 첫 번째 IP가 실제 클라이언트 IP임
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    private String getHeaderOrDefault(HttpServletRequest request, String headerName, String defaultValue) {
        String value = request.getHeader(headerName);
        return (value != null && !value.isBlank()) ? value : defaultValue;
    }

    private String hashSha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256이 없는 환경은 사실상 없으므로 런타임 에러로 변환
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}
