package com.ssafy.tickle.blacklist.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 관리자 블랙리스트 수동 등록 요청 DTO입니다.
 *
 * @param userId 블랙리스트 대상 사용자 식별자
 * @param reason 등록 사유 ({@code Blacklist.Reason} enum 이름과 일치해야 함)
 * @param detail 상세 설명 (선택)
 */
public record AddBlacklistRequest(
        @NotNull Long userId,
        @NotBlank String reason,
        String detail
) {
}
