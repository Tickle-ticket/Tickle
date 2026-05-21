package com.ssafy.tickle.blacklist.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * AI/FE 서비스에서 블랙리스트를 단건 등록할 때 사용하는 내부 요청 DTO입니다.
 *
 * @param userId    블랙리스트 대상 사용자 식별자
 * @param reason    등록 사유 ({@code Blacklist.Reason} enum 이름과 일치해야 함)
 * @param detail    상세 설명 (선택)
 * @param ipAddress 탐지 당시 IP 주소 (선택, IP_RATE_LIMIT 탐지 시 저장)
 */
public record InternalAddBlacklistRequest(
        @NotNull Long userId,
        @NotBlank String reason,
        String detail,
        String ipAddress
) {
}
