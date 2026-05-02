package com.ssafy.tickle.user.presentation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import com.ssafy.tickle.user.domain.UserRole;
import java.time.LocalDate;

/**
 * Auth 서버에서 전달하는 내부 사용자 생성 요청 DTO입니다.
 *
 * <p>회원가입 완료 후 Auth 서버가 tickle_core.users 레코드 생성을 위해 호출합니다.</p>
 *
 * @param userId   사용자 PK (tickle_auth.users.id와 동일)
 * @param userNo   외부 노출용 사용자 번호 (예: TK-a1b2c3d4)
 * @param email    이메일
 * @param name     실명
 * @param nickname 닉네임
 */
public record CreateUserRequest(

        @NotNull(message = "userId는 필수입니다.")
        @Positive(message = "userId는 양수여야 합니다.")
        Long userId,

        @NotBlank(message = "userNo는 필수입니다.")
        String userNo,

        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        String email,

        @NotBlank(message = "이름은 필수입니다.")
        String name,

        String nickname,

        @NotBlank(message = "전화번호는 필수입니다.")
        String phoneNumber,

        @NotNull(message = "권한은 필수입니다.")
        UserRole role,

        String organizerName,

        LocalDate birthDate
) {
}
