package com.ssafy.tickle.user.presentation.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 내 정보 부분 수정 요청 DTO입니다.
 *
 * @param phoneNumber 전화번호
 * @param nickname 닉네임
 * @param profileImageUrl 프로필 이미지 URL
 */
public record UpdateMyInfoRequest(
        @Pattern(
                regexp = "^01[0-9]-\\d{3,4}-\\d{4}$",
                message = "전화번호 형식이 올바르지 않습니다."
        )
        String phoneNumber,

        @Size(min = 1, max = 100, message = "닉네임은 1자 이상 100자 이하여야 합니다.")
        String nickname,

        @Size(max = 500, message = "프로필 이미지 URL은 500자 이하여야 합니다.")
        String profileImageUrl
) {

    public boolean hasNoChanges() {
        return phoneNumber == null
                && nickname == null
                && profileImageUrl == null;
    }
}
