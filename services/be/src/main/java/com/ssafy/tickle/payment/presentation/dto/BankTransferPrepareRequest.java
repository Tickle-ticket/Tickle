package com.ssafy.tickle.payment.presentation.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 무통장 입금 결제 준비 요청 DTO입니다.
 *
 * @param bookingId 예매 초안 식별자
 */
public record BankTransferPrepareRequest(
        @NotNull(message = "bookingId는 필수입니다.")
        Long bookingId
) {
}
