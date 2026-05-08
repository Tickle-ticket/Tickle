package com.ssafy.tickle.auth.common.response;

import com.ssafy.tickle.auth.common.exception.code.SuccessCode;

/**
 * 모든 API 응답에서 사용하는 공통 응답 포맷입니다.
 *
 * @param status  HTTP 상태 코드
 * @param message 응답 메시지
 * @param data    응답 데이터
 */
public record BaseResponse<T>(int status, String message, T data) {

    public static <T> BaseResponse<T> success(T data) {
        return new BaseResponse<>(200, "OK", data);
    }

    public static <T> BaseResponse<T> success(SuccessCode code, T data) {
        return new BaseResponse<>(code.getStatus(), code.getMessage(), data);
    }

    public static <T> BaseResponse<T> success(SuccessCode code) {
        return new BaseResponse<>(code.getStatus(), code.getMessage(), null);
    }

    public static <T> BaseResponse<T> error(int status, String message) {
        return new BaseResponse<>(status, message, null);
    }
}
