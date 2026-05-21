package com.ssafy.tickle.auth.user.presentation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 어드민 계정 생성 요청 DTO입니다.
 *
 * <p>전화번호 인증 없이 ADMIN 권한 계정을 생성한다. X-Admin-Secret 헤더 인증 필수.</p>
 *
 * @param email    이메일 (로그인 ID)
 * @param password 비밀번호 (8자 이상, 영문+숫자+특수문자)
 * @param name     실명
 * @param nickname 닉네임
 */
public record AdminSignUpRequest(

        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        String email,

        @NotBlank(message = "비밀번호는 필수입니다.")
        @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$",
                message = "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다."
        )
        String password,

        @NotBlank(message = "이름은 필수입니다.")
        String name,

        @NotBlank(message = "닉네임은 필수입니다.")
        String nickname
) {
}
