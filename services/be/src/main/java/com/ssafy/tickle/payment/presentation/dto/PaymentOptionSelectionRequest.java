package com.ssafy.tickle.payment.presentation.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 좌석별 권종 선택 요청 DTO입니다.
 *
 * @param sessionSeatId 선택 대상 회차 좌석 ID
 * @param discountName 선택한 할인/권종 이름
 */
public record PaymentOptionSelectionRequest(
        @NotNull(message = "sessionSeatId는 필수입니다.")
        Long sessionSeatId,
        String discountName
) {
}
