package com.ssafy.tickle.seat.domain;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 좌석 선점/해제 관련 에러 코드입니다.
 */
@Getter
@RequiredArgsConstructor
public enum SeatErrorCode implements ErrorCode {

    /** 이미 선점됐거나 AVAILABLE이 아닌 좌석을 다시 선점 시도 */
    SEAT_ALREADY_HELD(HttpStatus.CONFLICT, "이미 선점된 좌석입니다."),

    /** 세션 단위 분산 락 획득 실패 또는 @Version 충돌 */
    SEAT_LOCK_FAILED(HttpStatus.CONFLICT, "현재 선점 요청이 많습니다. 잠시 후 다시 시도해주세요."),

    /** 요청한 sessionSeatId가 DB에 존재하지 않음 */
    SEAT_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 좌석입니다.");

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public int getStatus() {
        return httpStatus.value();
    }
}
