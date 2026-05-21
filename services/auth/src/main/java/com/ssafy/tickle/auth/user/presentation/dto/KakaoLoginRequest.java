package com.ssafy.tickle.auth.user.presentation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * 카카오 로그인 요청 DTO입니다.
 *
 * @param code        카카오로부터 받은 Authorization Code
 * @param redirectUri 카카오 로그인을 요청할 때 사용했던 프론트엔드의 Redirect URI
 */
@Schema(description = "카카오 로그인 요청 DTO")
public record KakaoLoginRequest(
        @Schema(description = "카카오 인가 코드", example = "k123abc456def...")
        @NotBlank(message = "카카오 인가 코드는 필수입니다.")
        String code,

        @Schema(description = "프론트엔드의 콜백 Redirect URI", example = "https://tickle-ticket.co.kr/oauth/callback")
        @NotBlank(message = "Redirect URI는 필수입니다.")
        String redirectUri
) {
}
