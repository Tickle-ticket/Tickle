package com.ssafy.tickle.queue.presentation.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 대기열 진입 등록 요청 DTO입니다.
 *
 * @param userId 사용자 식별자
 * @param sessionId 예매 대상 회차 식별자
 */
public record QueueEnterRequest(
        @NotNull(message = "사용자 식별자는 필수입니다.")
        Long userId,

        @NotNull(message = "회차 식별자는 필수입니다.")
        Long sessionId
) {
}
