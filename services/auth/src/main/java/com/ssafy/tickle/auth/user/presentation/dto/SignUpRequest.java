package com.ssafy.tickle.auth.user.presentation.dto;

import com.ssafy.tickle.auth.user.domain.AuthUser;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * 자체 회원가입 요청 DTO입니다.
 *
 * <p>role에 따라 필드 요구사항이 다르며, 서비스 레이어에서 role 기반 검증을 수행한다.</p>
 *
 * @param email         이메일 (유일값, 로그인 ID로 사용)
 * @param password      비밀번호 (8자 이상, 영문+숫자+특수문자 포함)
 * @param name          이름 (12자 이하, 특수문자 불가)
 * @param nickname      닉네임 (20자 이하, 영어·한글 가능, 특수문자 불가) — 기획사는 null 가능
 * @param phoneNumber   휴대폰 번호 (인증 완료된 번호, 010xxxxxxxx 형식)
 * @param role          사용자 권한 (USER | ORGANIZER)
 * @param birthDate     생년월일 — 기획사는 null 가능
 * @param organizerName 기획사명 — 일반 회원은 null
 */
public record SignUpRequest(

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
        @Size(max = 12, message = "이름은 12자 이하여야 합니다.")
        @Pattern(regexp = "^[가-힣a-zA-Z\\s]+$", message = "이름은 한글, 영문만 사용 가능합니다.")
        String name,

        @Size(max = 20, message = "닉네임은 20자 이하여야 합니다.")
        @Pattern(regexp = "^[가-힣a-zA-Z0-9]*$", message = "닉네임은 한글, 영문, 숫자만 사용 가능합니다.")
        String nickname,

        @NotBlank(message = "휴대폰 번호는 필수입니다.")
        @Pattern(regexp = "^010\\d{8}$", message = "올바른 휴대폰 번호 형식이 아닙니다. (010xxxxxxxx)")
        String phoneNumber,

        @NotNull(message = "사용자 권한은 필수입니다.")
        AuthUser.Role role,

        LocalDate birthDate,

        @Size(max = 200, message = "기획사명은 200자 이하여야 합니다.")
        String organizerName
) {
}
