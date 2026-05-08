package com.ssafy.tickle.auth.user.presentation.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Access Token 재발급 요청 DTO입니다.
 *
 * @param refreshToken Refresh Token
 */
public record ReissueRequest(

        @NotBlank(message = "Refresh Token은 필수입니다.")
        String refreshToken
) {
}
