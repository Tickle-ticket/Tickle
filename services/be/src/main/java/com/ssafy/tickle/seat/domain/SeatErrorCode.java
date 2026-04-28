package com.ssafy.tickle.seat.domain;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 좌석 선점/해제 관련 에러 코드를 정의합니다.
 */
@Getter
@RequiredArgsConstructor
public enum SeatErrorCode implements ErrorCode {

    /** 이미 선점/확정/차단된 좌석이 포함된 경우 */
    SEAT_ALREADY_HELD(409, "이미 선점된 좌석이 포함되어 있습니다."),

    /** 세션 단위 분산 락 획득 실패 (다른 사용자가 선점 시도 중) */
    SEAT_LOCK_FAILED(409, "좌석 선점에 실패했습니다. 잠시 후 다시 시도해주세요."),

    /** 요청한 좌석 ID 중 존재하지 않는 ID가 있는 경우 */
    SEAT_NOT_FOUND(404, "요청한 좌석을 찾을 수 없습니다.");

    private final int status;
    private final String message;
}
