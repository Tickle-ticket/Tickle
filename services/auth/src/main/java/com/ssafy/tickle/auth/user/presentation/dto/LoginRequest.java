package com.ssafy.tickle.auth.user.presentation.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 자체 로그인 요청 DTO입니다.
 *
 * @param email    이메일
 * @param password 비밀번호
 */
public record LoginRequest(

        @NotBlank(message = "이메일은 필수입니다.")
        String email,

        @NotBlank(message = "비밀번호는 필수입니다.")
        String password
) {
}
