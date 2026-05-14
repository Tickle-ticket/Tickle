package com.ssafy.tickle.common.util;

import com.ssafy.tickle.auth.domain.AuthErrorCode;
import com.ssafy.tickle.common.exception.BaseException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

import com.ssafy.tickle.user.domain.UserRole;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * JWT 검증 및 클레임 추출을 담당합니다.
 *
 * <p>토큰 발급은 Auth 서버에서 담당하며, 이 클래스는 검증과 userId 추출만 수행합니다.</p>
 */
@Slf4j
@Component
public class JwtProvider {

    private static final String BEARER_PREFIX = "Bearer ";

    private final String secret;

    public JwtProvider(@Value("${jwt.secret}") String secret) {
        this.secret = secret;
    }

    /**
     * Bearer 토큰에서 userId를 추출합니다.
     *
     * @param token Authorization 헤더 값 또는 순수 JWT 문자열
     * @return 사용자 식별자
     * @throws BaseException 토큰이 유효하지 않거나 만료된 경우
     */
    public Long extractUserId(String token) {
        Claims claims = parseClaims(token.startsWith(BEARER_PREFIX) ? token.substring(BEARER_PREFIX.length()) : token);
        String subject = claims.getSubject();
        if (subject == null) {
            throw new BaseException(AuthErrorCode.INVALID_TOKEN);
        }
        return Long.parseLong(subject);
    }

    /**
     * 요청의 Authorization 헤더에서 userId를 추출합니다.
     *
     * <p>토큰이 없으면 Optional.empty()를 반환합니다.</p>
     *
     * @param request HTTP 요청
     * @return userId, 토큰 없으면 empty
     */
    public Optional<Long> extractUserIdFromRequest(HttpServletRequest request) {
        String token = resolveToken(request);
        if (token == null) {
            return Optional.empty();
        }
        return Optional.of(extractUserId(token));
    }

    /**
     * Bearer 토큰에서 UserRole을 추출합니다.
     *
     * @param request HTTP 요청
     * @return UserRole, 토큰 없거나 파싱 실패 시 empty
     */
    public Optional<UserRole> extractRoleFromRequest(HttpServletRequest request) {
        String token = resolveToken(request);
        if (token == null) {
            return Optional.empty();
        }
        try {
            Claims claims = parseClaims(token);
            String roleName = claims.get("role", String.class);
            if (roleName == null) {
                return Optional.empty();
            }
            return Optional.of(UserRole.valueOf(roleName));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Authorization 헤더에서 Bearer 토큰을 추출합니다.
     *
     * @param request HTTP 요청
     * @return JWT 문자열, Bearer 헤더 없으면 null
     */
    public String resolveToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            return null;
        }
        return header.substring(BEARER_PREFIX.length());
    }

    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            throw new BaseException(AuthErrorCode.EXPIRED_TOKEN);
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT 파싱 실패: {}", e.getMessage());
            throw new BaseException(AuthErrorCode.INVALID_TOKEN);
        }
    }
}
