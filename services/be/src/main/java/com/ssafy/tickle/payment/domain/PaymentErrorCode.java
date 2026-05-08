package com.ssafy.tickle.payment.domain;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 결제 도메인 에러 코드를 정의합니다.
 */
@Getter
@RequiredArgsConstructor
public enum PaymentErrorCode implements ErrorCode {

    PAYMENT_HOLD_NOT_FOUND(404, "유효한 좌석 선점 정보를 찾을 수 없습니다."),
    PAYMENT_NOT_FOUND(404, "결제 정보를 찾을 수 없습니다."),
    PAYMENT_USER_NOT_FOUND(404, "결제 사용자를 찾을 수 없습니다."),
    PAYMENT_ALREADY_PROCESSED(409, "이미 처리된 결제입니다."),
    PAYMENT_INVALID_STATE(409, "현재 결제 상태에서는 요청을 처리할 수 없습니다."),
    PAYMENT_METHOD_NOT_SUPPORTED(400, "아직 지원하지 않는 결제 방식입니다."),
    PAYMENT_OPTION_INVALID(400, "유효하지 않은 권종 선택입니다.");

    private final int status;
    private final String message;
}
