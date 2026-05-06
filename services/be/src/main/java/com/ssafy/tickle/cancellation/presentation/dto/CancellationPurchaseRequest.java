package com.ssafy.tickle.cancellation.presentation.dto;

import com.ssafy.tickle.payment.domain.Payment;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "취소표 구매 요청 DTO")
public record CancellationPurchaseRequest(
        @Schema(description = "결제 수단", example = "KAKAOPAY")
        @NotNull(message = "결제 수단은 필수입니다.")
        Payment.MethodType paymentMethod
) {
}
