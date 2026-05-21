package com.ssafy.tickle.cancellation.presentation.dto;

import com.ssafy.tickle.payment.domain.Payment;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;

@Schema(description = "취소표 구매 응답 DTO (결제 수단별 필드 포함)")
public record CancellationPurchaseResponse(
        @Schema(description = "공연 식별자")
        Long eventId,
        @Schema(description = "회차 식별자")
        Long scheduleId,
        @Schema(description = "결제 수단")
        Payment.MethodType paymentMethod,
        @Schema(description = "예매 식별자")
        Long bookingId,
        @Schema(description = "예매 번호")
        String bookingNo,
        @Schema(description = "결제 금액")
        BigDecimal orderAmount,
        @Schema(description = "통화 코드")
        String currencyCode,

        // KAKAOPAY 전용
        @Schema(description = "카카오페이 결제 리다이렉트 URL (KAKAOPAY 시 존재)")
        String redirectUrl,

        // BANK_TRANSFER 전용
        @Schema(description = "가상계좌 번호 (BANK_TRANSFER 시 존재)")
        String bankAccount,
        @Schema(description = "예금주 (BANK_TRANSFER 시 존재)")
        String accountHolder,
        @Schema(description = "입금 마감 시각 (BANK_TRANSFER 시 존재)")
        Instant depositDeadline
) {
    /**
     * 카카오페이 결제용 응답을 생성합니다.
     */
    public static CancellationPurchaseResponse forKakaoPay(
            Long eventId,
            Long scheduleId,
            Long bookingId,
            String bookingNo,
            BigDecimal orderAmount,
            String currencyCode,
            String redirectUrl
    ) {
        return new CancellationPurchaseResponse(
                eventId,
                scheduleId,
                Payment.MethodType.KAKAOPAY,
                bookingId,
                bookingNo,
                orderAmount,
                currencyCode,
                redirectUrl,
                null, null, null
        );
    }

    /**
     * 무통장 입금용 응답을 생성합니다.
     */
    public static CancellationPurchaseResponse forBankTransfer(
            Long eventId,
            Long scheduleId,
            Long bookingId,
            String bookingNo,
            BigDecimal orderAmount,
            String currencyCode,
            String bankAccount,
            String accountHolder,
            Instant depositDeadline
    ) {
        return new CancellationPurchaseResponse(
                eventId,
                scheduleId,
                Payment.MethodType.BANK_TRANSFER,
                bookingId,
                bookingNo,
                orderAmount,
                currencyCode,
                null,
                bankAccount,
                accountHolder,
                depositDeadline
        );
    }
}
