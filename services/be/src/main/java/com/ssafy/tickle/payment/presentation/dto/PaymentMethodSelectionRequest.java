package com.ssafy.tickle.payment.presentation.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 권종 선택까지 끝난 예매 초안에 대해 결제 수단을 선택하는 요청 DTO입니다.
 *
 * @param bookingId 결제 수단을 선택할 예매 초안 식별자
 * @param paymentMethod 선택한 결제 수단
 */
public record PaymentMethodSelectionRequest(
        @NotNull(message = "bookingId는 필수입니다.")
        Long bookingId,
        @NotNull(message = "paymentMethod는 필수입니다.")
        PaymentMethod paymentMethod
) {
    /**
     * 현재 선택 가능한 결제 수단입니다.
     */
    public enum PaymentMethod {
        BANK_TRANSFER,
        KAKAOPAY
    }
}
