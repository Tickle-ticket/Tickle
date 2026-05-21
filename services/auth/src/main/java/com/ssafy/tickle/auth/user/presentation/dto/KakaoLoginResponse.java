package com.ssafy.tickle.auth.user.presentation.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 카카오 로그인 응답 DTO입니다.
 *
 * @param isNewUser    신규 가입 필요 여부 (true면 전화번호 인증 등 추가 정보 입력 필요)
 * @param signUpToken  신규 가입 시 필요한 임시 토큰 (isNewUser=true 일 때만 존재)
 * @param accessToken  기존 회원일 경우 발급되는 Access Token (isNewUser=false 일 때만 존재)
 */
@Schema(description = "카카오 로그인 응답 DTO")
public record KakaoLoginResponse(
        @Schema(description = "신규 가입 필요 여부", example = "true")
        boolean isNewUser,

        @Schema(description = "신규 가입 시 필요한 임시 토큰", example = "uuid-string-...")
        String signUpToken,

        @Schema(description = "Access Token", example = "eyJhbGciOiJIUzI1NiJ9...")
        String accessToken
) {
}
