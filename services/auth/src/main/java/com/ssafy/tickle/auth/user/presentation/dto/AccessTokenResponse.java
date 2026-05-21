package com.ssafy.tickle.auth.user.presentation.dto;

/**
 * Access Token 발급 응답 DTO입니다.
 *
 * @param accessToken Access Token (JWT, 만료 30분)
 */
public record AccessTokenResponse(
        String accessToken
) {
}
