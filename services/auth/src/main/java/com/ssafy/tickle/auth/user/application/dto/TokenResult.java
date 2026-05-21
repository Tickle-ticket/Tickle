package com.ssafy.tickle.auth.user.application.dto;

/**
 * 인증 토큰 발급 결과입니다.
 */
public record TokenResult(
        String accessToken,
        String refreshToken,
        Long userId,
        Long organizerId
) {
}
