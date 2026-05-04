package com.ssafy.tickle.auth.user.presentation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * 카카오 신규 가입 마무리 요청 DTO입니다.
 */
@Schema(description = "카카오 신규 가입 마무리 요청 DTO")
public record KakaoSignUpRequest(
        @Schema(description = "카카오 로그인 시 발급받은 임시 가입 토큰", example = "uuid-string-...")
        @NotBlank(message = "임시 가입 토큰은 필수입니다.")
        String signUpToken,

        @Schema(description = "인증 완료된 휴대폰 번호", example = "01012345678")
        @NotBlank(message = "휴대폰 번호는 필수입니다.")
        @Pattern(regexp = "^010\\d{8}$", message = "올바른 휴대폰 번호 형식이 아닙니다. (010xxxxxxxx)")
        String phoneNumber,

        @Schema(description = "실명", example = "홍길동")
        @NotBlank(message = "이름은 필수입니다.")
        @Size(max = 12, message = "이름은 12자 이하여야 합니다.")
        @Pattern(regexp = "^[가-힣a-zA-Z\\s]+$", message = "이름은 한글, 영문만 사용 가능합니다.")
        String name,

        @Schema(description = "생년월일", example = "1990-01-01")
        @NotNull(message = "생년월일은 필수입니다.")
        LocalDate birthDate
) {
}
