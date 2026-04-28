package com.ssafy.tickle.auth.user.presentation.dto;

/**
 * 토큰 발급 응답 DTO입니다.
 *
 * @param accessToken  Access Token (JWT, 만료 30분)
 * @param refreshToken Refresh Token (JWT, 만료 7일)
 * @param userId       사용자 식별자
 */
public record TokenResponse(
        String accessToken,
        String refreshToken,
        Long userId
) {
}
