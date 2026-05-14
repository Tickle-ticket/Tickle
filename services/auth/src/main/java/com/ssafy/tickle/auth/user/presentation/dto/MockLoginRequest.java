package com.ssafy.tickle.auth.user.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 목로그인 요청 DTO입니다.
 *
 * @param name 사용자 이름
 * @param phoneNumber 휴대폰 번호
 */
public record MockLoginRequest(

        @NotBlank(message = "이름은 필수입니다.")
        @Size(max = 12, message = "이름은 12자 이하여야 합니다.")
        @Pattern(regexp = "^[가-힣a-zA-Z\\s]+$", message = "이름은 한글, 영문만 사용 가능합니다.")
        String name,

        @NotBlank(message = "휴대폰 번호는 필수입니다.")
        @Pattern(regexp = "^010\\d{8}$", message = "올바른 휴대폰 번호 형식이 아닙니다. (010xxxxxxxx)")
        String phoneNumber
) {
}
