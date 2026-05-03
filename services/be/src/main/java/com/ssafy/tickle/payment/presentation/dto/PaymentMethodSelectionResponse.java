package com.ssafy.tickle.payment.presentation.dto;

/**
 * 결제 수단 선택 결과 응답 DTO입니다.
 *
 * <p>이 응답은 결제 수단 선택 자체만 다루며,
 * 실제 준비 로직은 FE가 `nextAction`에 맞는 별도 API를 호출해 진행합니다.</p>
 *
 * @param bookingId 예매 초안 식별자
 * @param paymentMethod 선택한 결제 수단
 * @param nextAction FE가 이어서 호출해야 할 다음 단계
 */
public record PaymentMethodSelectionResponse(
        Long bookingId,
        PaymentMethodSelectionRequest.PaymentMethod paymentMethod,
        NextAction nextAction
) {
    /**
     * FE가 이어서 호출해야 할 다음 단계를 나타내는 값입니다.
     */
    public enum NextAction {
        PREPARE_BANK_TRANSFER,
        PREPARE_KAKAOPAY
    }

    /**
     * 무통장 입금 선택 결과 응답을 생성합니다.
     *
     * @param bookingId 예매 초안 식별자
     * @return 결제 수단 선택 결과
     */
    public static PaymentMethodSelectionResponse forBankTransfer(Long bookingId) {
        return new PaymentMethodSelectionResponse(
                bookingId,
                PaymentMethodSelectionRequest.PaymentMethod.BANK_TRANSFER,
                NextAction.PREPARE_BANK_TRANSFER
        );
    }

    /**
     * 카카오페이 선택 결과 응답을 생성합니다.
     *
     * @param bookingId 예매 초안 식별자
     * @return 결제 수단 선택 결과
     */
    public static PaymentMethodSelectionResponse forKakaoPay(Long bookingId) {
        return new PaymentMethodSelectionResponse(
                bookingId,
                PaymentMethodSelectionRequest.PaymentMethod.KAKAOPAY,
                NextAction.PREPARE_KAKAOPAY
        );
    }
}
