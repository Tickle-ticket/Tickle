package com.ssafy.tickle.auth.user.application.dto;

import com.ssafy.tickle.auth.user.presentation.dto.KakaoLoginResponse;

/**
 * 카카오 로그인 처리 결과입니다.
 */
public record KakaoLoginResult(
        KakaoLoginResponse response,
        String refreshToken
) {
}
