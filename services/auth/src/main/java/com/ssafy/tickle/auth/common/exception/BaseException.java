package com.ssafy.tickle.auth.common.exception;

import com.ssafy.tickle.auth.common.exception.code.ErrorCode;
import lombok.Getter;

/**
 * 모든 커스텀 예외의 최상위 예외 클래스입니다.
 */
@Getter
public class BaseException extends RuntimeException {

    private final ErrorCode errorCode;

    /**
     * 기본 메시지를 사용하는 예외를 생성합니다.
     *
     * @param errorCode 에러 코드
     */
    public BaseException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    /**
     * 커스텀 메시지를 사용하는 예외를 생성합니다.
     *
     * @param errorCode 에러 코드
     * @param message   상세 메시지
     */
    public BaseException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
