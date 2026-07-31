package com.ssafy.tickle.common.response;

import com.ssafy.tickle.common.exception.code.ErrorCode;
import com.ssafy.tickle.common.exception.code.SuccessCode;

/**
 * 모든 API 응답에서 사용하는 공통 응답 포맷입니다.
 *
 * @param status  HTTP 상태 코드
 * @param code    결과 코드 이름. 성공은 "OK", 실패는 ErrorCode 상수 이름
 * @param message 사용자에게 보여줄 메시지
 * @param data    응답 데이터
 * @param <T> 응답 데이터 타입
 */
public record BaseResponse<T>(
        int status,
        String code,
        String message,
        T data
) {

    /** 성공 응답의 결과 코드. */
    private static final String SUCCESS_CODE = "OK";

    /** 대응하는 ErrorCode 상수가 없는 실패 응답의 코드. */
    private static final String UNKNOWN_ERROR_CODE = "UNKNOWN";

    /**
     * SuccessCode와 데이터를 기반으로 성공 응답을 생성합니다.
     *
     * @param code 성공 코드
     * @param data 응답 데이터
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(SuccessCode code, T data) {
        return new BaseResponse<>(code.getStatus(), SUCCESS_CODE, code.getMessage(), data);
    }

    /**
     * SuccessCode만을 기반으로 성공 응답을 생성합니다.
     *
     * @param code 성공 코드
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(SuccessCode code) {
        return new BaseResponse<>(code.getStatus(), SUCCESS_CODE, code.getMessage(), null);
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
        return new BaseResponse<>(status, SUCCESS_CODE, message, data);
    }

    /**
     * 데이터를 포함한 기본 성공 응답을 생성합니다.
     *
     * @param data 응답 데이터
     * @param <T> 응답 데이터 타입
     * @return 성공 응답
     */
    public static <T> BaseResponse<T> success(T data) {
        return new BaseResponse<>(200, SUCCESS_CODE, "OK", data);
    }

    /**
     * 에러 코드를 기반으로 실패 응답을 생성합니다.
     *
     * <p>클라이언트가 사유를 구분할 수 있도록 code를 함께 싣습니다. 실패 응답은
     * 되도록 이 메서드를 쓰고, 상수 없이 문자열만 있는 곳에서만 아래 오버로드를
     * 사용합니다.</p>
     *
     * @param errorCode 에러 코드
     * @param message   사용자에게 보여줄 메시지 (커스텀 메시지를 허용하기 위해 분리)
     * @param <T> 응답 데이터 타입
     * @return 실패 응답
     */
    public static <T> BaseResponse<T> error(ErrorCode errorCode, String message) {
        return new BaseResponse<>(errorCode.getStatus(), errorCode.getCode(), message, null);
    }

    /**
     * 에러 코드의 기본 메시지로 실패 응답을 생성합니다.
     *
     * @param errorCode 에러 코드
     * @param <T> 응답 데이터 타입
     * @return 실패 응답
     */
    public static <T> BaseResponse<T> error(ErrorCode errorCode) {
        return error(errorCode, errorCode.getMessage());
    }

    /**
     * 상태 코드와 메시지만으로 실패 응답을 생성합니다.
     *
     * <p>대응하는 ErrorCode 상수가 없는 경우에만 사용합니다. code에는 사유를 알 수
     * 없다는 뜻으로 {@code UNKNOWN}을 채웁니다 — 클라이언트가 status로만 분기하게
     * 두기보다, 코드가 비어 있음을 명시하는 편이 낫습니다.</p>
     *
     * @param status HTTP 상태 코드
     * @param message 에러 메시지
     * @param <T> 응답 데이터 타입
     * @return 실패 응답
     */
    public static <T> BaseResponse<T> error(int status, String message) {
        return new BaseResponse<>(status, UNKNOWN_ERROR_CODE, message, null);
    }
}
