package com.ssafy.tickle.auth.user.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PhoneCodeVerifyRequest(
        @NotBlank(message = "휴대폰 번호는 필수입니다.")
        @Pattern(regexp = "^010\\d{8}$", message = "올바른 휴대폰 번호 형식이 아닙니다.")
        String phoneNumber,

        @NotBlank(message = "인증 코드는 필수입니다.")
        @Pattern(regexp = "^\\d{6}$", message = "인증 코드는 6자리 숫자입니다.")
        String code
) {
}
