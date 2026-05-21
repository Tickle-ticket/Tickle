package com.ssafy.tickle.auth.user.infrastructure.oauth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Kakao 토큰 발급 응답 DTO입니다.
 *
 * @param tokenType 토큰 타입
 * @param accessToken Kakao Access Token
 * @param expiresIn Access Token 만료 시간(초)
 * @param refreshToken Kakao Refresh Token
 * @param refreshTokenExpiresIn Refresh Token 만료 시간(초)
 * @param scope 동의된 scope
 */
public record KakaoTokenResponse(
        @JsonProperty("token_type")
        String tokenType,

        @JsonProperty("access_token")
        String accessToken,

        @JsonProperty("expires_in")
        Integer expiresIn,

        @JsonProperty("refresh_token")
        String refreshToken,

        @JsonProperty("refresh_token_expires_in")
        Integer refreshTokenExpiresIn,

        String scope
) {
}
