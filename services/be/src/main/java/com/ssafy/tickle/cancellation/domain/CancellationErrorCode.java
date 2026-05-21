package com.ssafy.tickle.cancellation.domain;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 예매 대기/취소표 도메인 에러 코드를 정의합니다.
 */
@Getter
@RequiredArgsConstructor
public enum CancellationErrorCode implements ErrorCode {

    CANDIDATE_LIMIT_EXCEEDED(400, "확정 예매와 예매 대기는 합쳐서 최대 4개까지 가능합니다."),
    CANDIDATE_DUPLICATE_SEAT(409, "이미 예매 대기 신청한 좌석이 포함되어 있습니다."),
    CANDIDATE_SEAT_NOT_WAITABLE(400, "예매 대기를 신청할 수 없는 좌석이 포함되어 있습니다."),
    CANDIDATE_NOT_FOUND(404, "예매 대기 신청을 찾을 수 없습니다."),
    CANDIDATE_ALREADY_CANCELLED(409, "이미 취소된 예매 대기 신청입니다."),
    CANDIDATE_NOT_CANCELLABLE(400, "취소할 수 없는 예매 대기 상태입니다."),
    CANDIDATE_LOCK_FAILED(409, "현재 예매 대기 신청 요청이 많습니다. 잠시 후 다시 시도해주세요.");

    private final int status;
    private final String message;
}
