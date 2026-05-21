package com.ssafy.tickle.reservation.domain;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 예매 도메인 에러 코드입니다.
 */
@Getter
@RequiredArgsConstructor
public enum ReservationErrorCode implements ErrorCode {

    BOOKING_NOT_FOUND(404, "예매를 찾을 수 없습니다."),
    BOOKING_ACCESS_DENIED(403, "해당 예매에 접근 권한이 없습니다."),
    BOOKING_ALREADY_CANCELLED(409, "이미 취소된 예매입니다."),
    BOOKING_NOT_CANCELLABLE(400, "취소할 수 없는 예매 상태입니다.");

    private final int status;
    private final String message;
}
