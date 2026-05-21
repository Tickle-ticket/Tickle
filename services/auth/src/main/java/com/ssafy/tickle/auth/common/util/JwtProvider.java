package com.ssafy.tickle.auth.common.util;

import com.ssafy.tickle.auth.user.domain.AuthUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/**
 * JWT Access Token / Refresh Token 발급 및 파싱을 담당합니다.
 *
 * <p>Access Token은 HS256 서명 + 짧은 만료(기본 30분),
 * Refresh Token은 서명 + 긴 만료(기본 7일)로 발급한다.</p>
 */
@Component
public class JwtProvider {

    private final SecretKey secretKey;
    private final long accessTokenExpiryMs;
    private final long refreshTokenExpiryMs;

    public JwtProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiry-seconds}") long accessTokenExpirySeconds,
            @Value("${jwt.refresh-token-expiry-seconds}") long refreshTokenExpirySeconds
    ) {
        // 최소 32바이트 이상의 시크릿이어야 HS256이 동작한다.
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiryMs = accessTokenExpirySeconds * 1000;
        this.refreshTokenExpiryMs = refreshTokenExpirySeconds * 1000;
    }

    /**
     * Access Token을 발급합니다.
     *
     * @param userId 사용자 식별자
     * @param role   사용자 권한
     * @return 서명된 Access Token 문자열
     */
    public String issueAccessToken(Long userId, AuthUser.Role role) {
        Instant now = Instant.now();
        // ADMIN은 30일, 일반 사용자는 기본 설정값 사용
        long expiryMs = (role == AuthUser.Role.ADMIN)
                ? 30L * 24 * 60 * 60 * 1000
                : accessTokenExpiryMs;
        return Jwts.builder()
                .subject(userId.toString())
                .claim("role", role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expiryMs)))
                .signWith(secretKey)
                .compact();
    }

    /**
     * Refresh Token을 발급합니다.
     *
     * @param userId 사용자 식별자
     * @return 서명된 Refresh Token 문자열
     */
    public String issueRefreshToken(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(refreshTokenExpiryMs)))
                .signWith(secretKey)
                .compact();
    }

    /**
     * 토큰에서 Claim을 파싱합니다.
     *
     * @param token JWT 문자열
     * @return 파싱된 Claims
     * @throws ExpiredJwtException      토큰 만료 시
     * @throws MalformedJwtException    토큰 형식 오류 시
     * @throws UnsupportedJwtException  지원하지 않는 알고리즘 시
     */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * 토큰의 subject(userId)를 반환합니다.
     *
     * @param token JWT 문자열
     * @return userId
     */
    public Long extractUserId(String token) {
        return Long.parseLong(parseClaims(token).getSubject());
    }

    /**
     * Refresh Token의 만료 시간(초)을 반환합니다.
     *
     * @return 만료 시간(초)
     */
    public long getRefreshTokenExpirySeconds() {
        return refreshTokenExpiryMs / 1000;
    }

    /**
     * 토큰의 남은 유효 시간(초)을 반환합니다. 이미 만료된 경우 0을 반환합니다.
     *
     * @param token JWT 문자열
     * @return 남은 유효 시간(초)
     */
    public long getRemainingExpirySeconds(String token) {
        Claims claims = parseClaims(token);
        long remainingMs = claims.getExpiration().getTime() - System.currentTimeMillis();
        return Math.max(0, remainingMs / 1000);
    }
}
