package com.ssafy.tickle.payment.presentation.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 카카오페이 결제 준비 요청 DTO입니다.
 *
 * @param bookingId 결제를 시작할 예매 초안 식별자
 */
public record KakaoPayReadyRequest(
        @NotNull(message = "bookingId는 필수입니다.")
        Long bookingId
) {
}
