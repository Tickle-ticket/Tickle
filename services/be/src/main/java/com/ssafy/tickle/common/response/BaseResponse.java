package com.ssafy.tickle.common.response;

import com.ssafy.tickle.common.exception.code.SuccessCode;

/**
 * 모든 API 응답에서 사용하는 공통 응답 포맷입니다.
 *
 * <p>상태 코드, 메시지, 데이터를 일관된 형태로 반환합니다.</p>
 *
 * @param <T> 응답 데이터 타입
 */
public record BaseResponse<T>(
        int status,
        String message,
        T data
) {

    /**
     * SuccessCode와 데이터를 기반으로 성공 응답을 생성합니다.
     *
     * @param code 성공 코드
     * @param data 응답 데이터
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(SuccessCode code, T data) {
        return new BaseResponse<>(code.getStatus(), code.getMessage(), data);
    }

    /**
     * SuccessCode만을 기반으로 성공 응답을 생성합니다.
     *
     * @param code 성공 코드
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(SuccessCode code) {
        return new BaseResponse<>(code.getStatus(), code.getMessage(), null);
    }

    /**
     * 상태 코드, 메시지, 데이터를 직접 지정한 성공 응답을 생성합니다.
     *
     * @param status HTTP 상태 코드
     * @param message 응답 메시지
     * @param data 응답 데이터
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(int status, String message, T data) {
        return new BaseResponse<>(status, message, data);
    }

    /**
     * 데이터를 포함한 기본 성공 응답을 생성합니다.
     *
     * @param data 응답 데이터
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(T data) {
        return new BaseResponse<>(200, "OK", data);
    }

    /**
     * 실패 응답을 생성합니다.
     *
     * @param status HTTP 상태 코드
     * @param message 에러 메시지
     * @param <T> 응답 데이터 타입
     * @return 실패 응답
     */
    public static <T> BaseResponse<T> error(int status, String message) {
        return new BaseResponse<>(status, message, null);
    }
}
